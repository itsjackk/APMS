package service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import repository.RefreshTokensRepository;
import tables.RefreshTokens;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Service
public class TokenRotationService {

    private static final Logger log = LoggerFactory.getLogger(TokenRotationService.class);

    @Autowired
    private RefreshTokensRepository refreshTokensRepository;

    @Autowired
    private JwtService jwtService;

    // Configuration values
    @Value("${jwt.rotation.max-count:100}")
    private int maxRotationCount;

    @Value("${jwt.rotation.rate-limit-seconds:60}")
    private int rateLimitSeconds;

    @Value("${jwt.rotation.max-rotations-per-minute:5}")
    private int maxRotationsPerMinute;

    @Transactional
    public RefreshTokens rotateToken(String oldToken, UUID userId, String username, String role, boolean rememberMe) {
        log.debug("Starting token rotation for user: {}", username);

        // 1. Find the old token in database
        RefreshTokens oldTokenEntity = refreshTokensRepository.findByToken(oldToken)
                .orElseThrow(() -> new SecurityException("Token not found in database"));

        validateTokenForRotation(oldTokenEntity);
        checkForTokenReuse(oldToken, oldTokenEntity.getTokenFamily());
        checkRotationRateLimit(oldTokenEntity.getTokenFamily());

        if (oldTokenEntity.getRotationCount() >= maxRotationCount) {
            log.warn("Token rotation count exceeded for user: {} (count: {})",
                    username, oldTokenEntity.getRotationCount());
            throw new SecurityException("Token rotation limit exceeded");
        }

        String newRefreshTokenJwt;
        LocalDateTime expiresAt;

        if (rememberMe) {
            newRefreshTokenJwt = jwtService.generateRefreshToken(userId, username, role, 30);
            expiresAt = jwtService.getRefreshTokenExpirationTime(30);
        } else {
            newRefreshTokenJwt = jwtService.generateRefreshToken(userId, username, role);
            expiresAt = jwtService.getRefreshTokenExpirationTime();
        }

        RefreshTokens newTokenEntity = new RefreshTokens();
        newTokenEntity.setUserId(userId);
        newTokenEntity.setToken(newRefreshTokenJwt);
        newTokenEntity.setExpiresAt(expiresAt);
        newTokenEntity.setRememberMe(rememberMe);
        newTokenEntity.setTokenFamily(oldTokenEntity.getTokenFamily()); // Same family
        newTokenEntity.setRotationCount(oldTokenEntity.getRotationCount() + 1); // Increment
        newTokenEntity.setPreviousToken(oldToken); // Link to old token
        newTokenEntity.setLastRotatedAt(LocalDateTime.now());

        newTokenEntity = refreshTokensRepository.save(newTokenEntity);

        oldTokenEntity.revoke();
        refreshTokensRepository.save(oldTokenEntity);

        log.info("Token rotated successfully for user: {} (rotation count: {})",
                username, newTokenEntity.getRotationCount());

        return newTokenEntity;
    }

    @Transactional
    private void checkForTokenReuse(String token, String tokenFamily) {
        Optional<RefreshTokens> successorToken = refreshTokensRepository.findByPreviousToken(token);

        if (successorToken.isPresent()) {
            log.error("🚨 TOKEN REUSE DETECTED! Token family: {} - Revoking entire family", tokenFamily);

            revokeTokenFamily(tokenFamily, "Token reuse detected");

            throw new SecurityException("Token reuse detected - all tokens revoked");
        }
    }

    @Transactional
    public void revokeTokenFamily(String tokenFamily, String reason) {
        log.warn("Revoking token family: {} - Reason: {}", tokenFamily, reason);

        refreshTokensRepository.revokeTokenFamily(tokenFamily, LocalDateTime.now());

        // Optional: Send security alert to user
        // emailService.sendSecurityAlert(userId, "Token theft detected");
    }

    private void validateTokenForRotation(RefreshTokens token) {
        if (token.isRevoked()) {
            throw new SecurityException("Cannot rotate revoked token");
        }

        if (token.isExpired()) {
            throw new SecurityException("Cannot rotate expired token");
        }

        if (token.isRevokedDueToReuse()) {
            throw new SecurityException("Token family was revoked due to reuse");
        }
    }

    /**
     * Check rotation rate limit (prevent rapid rotation attacks)
     */
    private void checkRotationRateLimit(String tokenFamily) {
        LocalDateTime rateLimitThreshold = LocalDateTime.now().minusSeconds(rateLimitSeconds);

        List<RefreshTokens> recentRotations = refreshTokensRepository
                .findRecentlyRotatedTokensInFamily(tokenFamily, rateLimitThreshold);

        if (recentRotations.size() >= maxRotationsPerMinute) {
            log.warn("Rate limit exceeded for token family: {} ({} rotations in {} seconds)",
                    tokenFamily, recentRotations.size(), rateLimitSeconds);
            throw new SecurityException("Token rotation rate limit exceeded");
        }
    }


    public String generateTokenFamily() {
        return UUID.randomUUID().toString();
    }

    public boolean hasMultipleActiveTokens(String tokenFamily) {
        long activeCount = refreshTokensRepository.countActiveTokensInFamily(
                tokenFamily, LocalDateTime.now());

        if (activeCount > 1) {
            log.warn("Multiple active tokens detected in family: {} (count: {})",
                    tokenFamily, activeCount);
            return true;
        }

        return false;
    }

    public List<RefreshTokens> getTokenFamily(String tokenFamily) {
        return refreshTokensRepository.findByTokenFamily(tokenFamily);
    }

    public List<RefreshTokens> findSuspiciousTokens() {
        return refreshTokensRepository.findTokensWithHighRotationCount(maxRotationCount - 10);
    }

    public List<RefreshTokens> getRecentSecurityIncidents(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return refreshTokensRepository.findTokensRevokedForReuse(since);
    }

    public Long getUserRotationCount(UUID userId) {
        Long count = refreshTokensRepository.getTotalRotationCountForUser(userId);
        return count != null ? count : 0L;
    }

    @Transactional
    public void cleanupOldTokensInFamily(String tokenFamily, int keepCount) {
        List<RefreshTokens> tokens = refreshTokensRepository.findByTokenFamily(tokenFamily);

        if (tokens.size() > keepCount) {
            // Sort by creation date (newest first)
            tokens.sort((t1, t2) -> t2.getCreatedAt().compareTo(t1.getCreatedAt()));

            // Delete old tokens (keep only recent ones)
            for (int i = keepCount; i < tokens.size(); i++) {
                refreshTokensRepository.delete(tokens.get(i));
            }

            log.debug("Cleaned up {} old tokens in family: {}",
                    tokens.size() - keepCount, tokenFamily);
        }
    }
}