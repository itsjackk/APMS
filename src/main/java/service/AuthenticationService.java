package service;

import dto.AuthenticationResponse;
import dto.SessionInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import repository.RefreshTokensRepository;
import repository.UserRepository;
import tables.RefreshTokens;
import tables.Users;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthenticationService {

    @Autowired
    private UserRepository usersRepository;

    @Autowired
    private RefreshTokensRepository refreshTokensRepository;

    @Autowired
    public JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private TokenRotationService tokenRotationService;

    private Logger log = LoggerFactory.getLogger(AuthenticationService.class);

    private static final int REMEMBER_ME_ACCESS_TOKEN_DAYS = 30;
    private static final int REMEMBER_ME_REFRESH_TOKEN_DAYS = 30;

    @Transactional
    public AuthenticationResponse login(String username, String password, boolean rememberMe) {
        Optional<Users> userOpt = usersRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            log.error("Invalid Username: {}", username);
            throw new RuntimeException("Invalid Username");
        }

        Users user = userOpt.get();

        if (!user.isAccountEnabled()) {
            throw new RuntimeException("Account is disabled");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.error("Invalid credentials for user " + username);
            throw new RuntimeException("Invalid credentials");
        }

        String accessToken;
        String refreshToken;
        LocalDateTime refreshTokenExpiration;

        if (rememberMe) {
            accessToken = jwtService.generateAccessToken(
                    user.getId(),
                    user.getUsername(),
                    user.getRole().toString(),
                    REMEMBER_ME_ACCESS_TOKEN_DAYS
            );
            refreshToken = jwtService.generateRefreshToken(
                    user.getId(),
                    user.getUsername(),
                    user.getRole().toString(),
                    REMEMBER_ME_REFRESH_TOKEN_DAYS
            );
            refreshTokenExpiration = jwtService.getRefreshTokenExpirationTime(REMEMBER_ME_REFRESH_TOKEN_DAYS);

            log.info("User {} logged in with Remember Me (tokens valid for 30 days)", username);
        } else {
            accessToken = jwtService.generateAccessToken(
                    user.getId(),
                    user.getUsername(),
                    user.getRole().toString()
            );
            refreshToken = jwtService.generateRefreshToken(
                    user.getId(),
                    user.getUsername(),
                    user.getRole().toString()
            );
            refreshTokenExpiration = jwtService.getRefreshTokenExpirationTime();

            log.info("User {} logged in (standard session - 25 minutes)", username);
        }

        String tokenFamily = tokenRotationService.generateTokenFamily();
        RefreshTokens refreshTokenEntity = new RefreshTokens();
        refreshTokenEntity.setUserId(user.getId());
        refreshTokenEntity.setToken(refreshToken);
        refreshTokenEntity.setExpiresAt(refreshTokenExpiration);
        refreshTokenEntity.setRememberMe(rememberMe);
        refreshTokenEntity.setTokenFamily(tokenFamily);
        refreshTokenEntity.setRotationCount(0); // Initial token
        refreshTokenEntity.setPreviousToken(null); // No previous token
        refreshTokenEntity.setLastRotatedAt(LocalDateTime.now());

        refreshTokensRepository.save(refreshTokenEntity);

        log.info("Created new token family: {} for user: {}", tokenFamily, username);

        return new AuthenticationResponse(accessToken, refreshToken, user.getUsername());
    }

    @Transactional
    public AuthenticationResponse login(String username, String password) {
        return login(username, password, false);
    }

    @Transactional
    public AuthenticationResponse refreshToken(String refreshToken) {
        try {
            // 1. Validate JWT structure
            String username = jwtService.extractUsername(refreshToken);

            if (!jwtService.isRefreshTokenValid(refreshToken, username)) {
                throw new RuntimeException("Invalid refresh token");
            }

            // 2. Find token in database
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty()) {
                throw new RuntimeException("Refresh token not found");
            }

            RefreshTokens tokenEntity = tokenOpt.get();

            // 3. Check if token is valid
            if (!tokenEntity.isValid() || tokenEntity.isExpired()) {
                refreshTokensRepository.delete(tokenEntity);
                throw new RuntimeException("Refresh token is expired or revoked");
            }

            // 4. Get user
            Optional<Users> userOpt = usersRepository.findById(tokenEntity.getUserId());
            if (userOpt.isEmpty() || !userOpt.get().isAccountEnabled()) {
                refreshTokensRepository.delete(tokenEntity);
                throw new RuntimeException("User not found or disabled");
            }

            Users user = userOpt.get();
            boolean rememberMe = tokenEntity.isRememberMe();

            // 5. Generate new access token
            String newAccessToken;
            if (rememberMe) {
                newAccessToken = jwtService.generateAccessToken(
                        user.getId(),
                        user.getUsername(),
                        user.getRole().toString(),
                        REMEMBER_ME_ACCESS_TOKEN_DAYS
                );
                log.debug("Generated new access token with Remember Me for user: {}", username);
            } else {
                newAccessToken = jwtService.generateAccessToken(
                        user.getId(),
                        user.getUsername(),
                        user.getRole().toString()
                );
                log.debug("Generated new access token (standard) for user: {}", username);
            }

            // 6. ROTATE THE REFRESH TOKEN (CRITICAL SECURITY FEATURE)
            RefreshTokens newTokenEntity = tokenRotationService.rotateToken(
                    refreshToken,
                    user.getId(),
                    user.getUsername(),
                    user.getRole().toString(),
                    rememberMe
            );

            log.info("Token rotated successfully for user: {} (rotation count: {})",
                    username, newTokenEntity.getRotationCount());

            // 7. Return new tokens
            return new AuthenticationResponse(
                    newAccessToken,
                    newTokenEntity.getToken(),
                    user.getUsername()
            );

        } catch (SecurityException e) {
            // Security-related errors (token reuse, rate limit, etc.)
            log.error("Security error during token refresh: {}", e.getMessage());
            throw new RuntimeException("Security error: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error during token refresh: {}", e.getMessage());
            throw new RuntimeException("Invalid refresh token: " + e.getMessage());
        }
    }

    @Transactional
    public void logout(String refreshToken) {
        Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
        if (tokenOpt.isPresent()) {
            RefreshTokens tokenEntity = tokenOpt.get();

            // Revoke the token first
            tokenEntity.revoke();
            log.info("Revoking token for user ID: {}", tokenEntity.getUserId());
            refreshTokensRepository.save(tokenEntity);

            // Immediately delete the revoked token
            refreshTokensRepository.delete(tokenEntity);
            log.info("Deleted revoked token for user ID: {}", tokenEntity.getUserId());
        } else {
            log.warn("Token not found for logout: {}", refreshToken);
        }
    }

    @Transactional
    public void logoutAllDevices(UUID userId) {
        log.info("Logging out all devices for user ID: {}", userId);
        // Get all token families for this user
        var userTokens = refreshTokensRepository.findByUserId(userId);
        // Revoke each token family
        userTokens.stream()
                .map(RefreshTokens::getTokenFamily)
                .distinct()
                .forEach(family -> {
                    tokenRotationService.revokeTokenFamily(family, "User logged out all devices");
                });
        refreshTokensRepository.deleteByUserId(userId);
        log.info("Deleted all tokens for user ID: {}", userId);
    }

    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Cleaning up expired and revoked tokens");
        int deletedCount = refreshTokensRepository.deleteExpiredAndRevokedTokens(LocalDateTime.now());
        log.info("Deleted {} expired and revoked tokens", deletedCount);
    }

    @Scheduled(fixedRate = 120000) // Every 2 minutes
    @Transactional
    public void autoRevokeExpiredTokens() {
        log.info("Auto-revoking expired tokens");
        int revokedCount = refreshTokensRepository.revokeExpiredTokens(LocalDateTime.now());
        int deleteCount = refreshTokensRepository.deleteExpiredAndRevokedTokens(LocalDateTime.now());
        log.info("Revoked {} expired tokens and deleted {} revoked or expired tokens",
                revokedCount, deleteCount);
    }


    @Scheduled(fixedRate = 900000) // Every 15 minutes
    @Transactional
    public void monitorSecurityIncidents() {
        log.info("Checking for security incidents...");

        // Check for tokens with high rotation counts
        var suspiciousTokens = tokenRotationService.findSuspiciousTokens();
        if (!suspiciousTokens.isEmpty()) {
            log.warn("Found {} tokens with suspicious rotation patterns", suspiciousTokens.size());
        }
        // Check for recent token reuse incidents
        var recentIncidents = tokenRotationService.getRecentSecurityIncidents(24);
        if (!recentIncidents.isEmpty()) {
            log.error("🚨 Found {} token reuse incidents in the last 24 hours", recentIncidents.size());
            // Optional: Send alert to admin
        }
    }

    public SessionInfo getUserSessionInfo(UUID userId) {
        var tokens = refreshTokensRepository.findByUserId(userId);

        long activeTokens = tokens.stream()
                .filter(t -> !t.isRevoked() && !t.isExpired())
                .count();

        long totalRotations = tokens.stream()
                .mapToLong(RefreshTokens::getRotationCount)
                .sum();

        return new SessionInfo(activeTokens, totalRotations);
    }
}