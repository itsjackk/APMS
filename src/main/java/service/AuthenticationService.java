
package service;

import dto.AuthenticationResponse;
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

    private Logger log = LoggerFactory.getLogger(AuthenticationService.class);

    // Token expiration constants (in days)
    private static final int REMEMBER_ME_ACCESS_TOKEN_DAYS = 30;
    private static final int REMEMBER_ME_REFRESH_TOKEN_DAYS = 30;

    /**
     * Login with rememberMe support
     */
    @Transactional
    public AuthenticationResponse login(String username, String password, boolean rememberMe) {
        Optional<Users> userOpt = usersRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Invalid credentials");
        }

        Users user = userOpt.get();

        if (!user.isAccountEnabled()) {
            throw new RuntimeException("Account is disabled");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Generate tokens based on rememberMe flag
        String accessToken;
        String refreshToken;
        LocalDateTime refreshTokenExpiration;

        if (rememberMe) {
            // Generate long-lived tokens (30 days)
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
            // Generate standard tokens (25 minutes access, 7 days refresh)
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

        // Save refresh token to database with rememberMe flag
        RefreshTokens refreshTokenEntity = new RefreshTokens(
                user.getId(),
                refreshToken,
                refreshTokenExpiration,
                rememberMe
        );
        refreshTokensRepository.save(refreshTokenEntity);

        return new AuthenticationResponse(accessToken, refreshToken, user.getUsername());
    }

    /**
     * Login without rememberMe (backward compatibility)
     */
    @Transactional
    public AuthenticationResponse login(String username, String password) {
        return login(username, password, false);
    }

    @Transactional
    public AuthenticationResponse refreshToken(String refreshToken) {
        try {
            String username = jwtService.extractUsername(refreshToken);

            if (!jwtService.isRefreshTokenValid(refreshToken, username)) {
                throw new RuntimeException("Invalid refresh token");
            }

            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty()) {
                throw new RuntimeException("Refresh token not found");
            }

            RefreshTokens tokenEntity = tokenOpt.get();
            if (!tokenEntity.isValid() || tokenEntity.isExpired()) {
                refreshTokensRepository.delete(tokenEntity);
                throw new RuntimeException("Refresh token is expired or revoked");
            }

            // Get user
            Optional<Users> userOpt = usersRepository.findById(tokenEntity.getUserId());
            if (userOpt.isEmpty() || !userOpt.get().isAccountEnabled()) {
                refreshTokensRepository.delete(tokenEntity);
                throw new RuntimeException("User not found or disabled");
            }

            Users user = userOpt.get();

            // Preserve the rememberMe setting from the original token
            boolean rememberMe = tokenEntity.isRememberMe();

            // Generate new tokens with same rememberMe setting
            String newAccessToken;
            String newRefreshToken;
            LocalDateTime newRefreshTokenExpiration;

            if (rememberMe) {
                // Generate long-lived tokens (30 days)
                newAccessToken = jwtService.generateAccessToken(
                        user.getId(),
                        user.getUsername(),
                        user.getRole().toString(),
                        REMEMBER_ME_ACCESS_TOKEN_DAYS
                );
                newRefreshToken = jwtService.generateRefreshToken(
                        user.getId(),
                        user.getUsername(),
                        user.getRole().toString(),
                        REMEMBER_ME_REFRESH_TOKEN_DAYS
                );
                newRefreshTokenExpiration = jwtService.getRefreshTokenExpirationTime(REMEMBER_ME_REFRESH_TOKEN_DAYS);

                log.info("Refreshed tokens for user {} with Remember Me (30 days)", username);
            } else {
                // Generate standard tokens (25 minutes access, 7 days refresh)
                newAccessToken = jwtService.generateAccessToken(
                        user.getId(),
                        user.getUsername(),
                        user.getRole().toString()
                );
                newRefreshToken = jwtService.generateRefreshToken(
                        user.getId(),
                        user.getUsername(),
                        user.getRole().toString()
                );
                newRefreshTokenExpiration = jwtService.getRefreshTokenExpirationTime();

                log.info("Refreshed tokens for user {} (standard session - 25 minutes)", username);
            }

            // Update the existing refresh token record with the new token
            tokenEntity.setToken(newRefreshToken);
            tokenEntity.setExpiresAt(newRefreshTokenExpiration);
            tokenEntity.setCreatedAt(LocalDateTime.now());
            tokenEntity.setRememberMe(rememberMe); // Preserve rememberMe flag

            // Save the updated token
            refreshTokensRepository.save(tokenEntity);

            return new AuthenticationResponse(newAccessToken, newRefreshToken, user.getUsername());

        } catch (Exception e) {
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

        // First revoke all tokens
        refreshTokensRepository.revokeAllUserTokens(userId);
        log.info("Revoked all tokens for user ID: {}", userId);

        // Then delete all revoked tokens for this user
        refreshTokensRepository.deleteByUserId(userId);
        log.info("Deleted all tokens for user ID: {}", userId);
    }

    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Cleaning up expired and revoked tokens");
        int deletedCount = refreshTokensRepository.deleteExpiredAndRevokedTokens(LocalDateTime.now());
        log.info("Deleted {} expired and revoked tokens", deletedCount);
    }

    @Scheduled(fixedRate = 900000) // Every 15 minutes
    @Transactional
    public void autoRevokeExpiredTokens() {
        log.info("Auto-revoking expired tokens");
        int revokedCount = refreshTokensRepository.revokeExpiredTokens(LocalDateTime.now());
        int deleteCount = refreshTokensRepository.deleteExpiredAndRevokedTokens(LocalDateTime.now());
        log.info("Revoked {} expired tokens and deleted {} revoked or expired tokens ", revokedCount, deleteCount);
    }
}
