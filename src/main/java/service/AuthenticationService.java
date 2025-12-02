
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

    @Transactional
    public AuthenticationResponse login(String username, String password) {
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

        // Generate tokens using JwtService
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), user.getRole().toString());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername(),user.getRole().toString());

        // Save refresh token to database
        RefreshTokens refreshTokenEntity = new RefreshTokens(
                user.getId(),
                refreshToken,
                jwtService.getRefreshTokenExpirationTime()
        );
        refreshTokensRepository.save(refreshTokenEntity);

        return new AuthenticationResponse(accessToken, refreshToken, user.getUsername());
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

            // Generate new tokens
            String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(),user.getRole().toString());
            String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername(),user.getRole().toString());

            // Update the existing refresh token record with the new token
            tokenEntity.setToken(newRefreshToken);
            tokenEntity.setExpiresAt(jwtService.getRefreshTokenExpirationTime());
            tokenEntity.setCreatedAt(LocalDateTime.now()); // Update creation time
            
            // Save the updated token
            refreshTokensRepository.save(tokenEntity);

            log.info("Updated refresh token for user: {}", username);
            log.info("New access token generated for user: {}", username);
            
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
        log.info("Revoked {} expired tokens", revokedCount);
    }
}
