
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

/**
 * Service responsible for secure token rotation
 * Implements automatic token rotation with reuse detection
 */
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

    // ============================================================================
    // TOKEN ROTATION
    // ============================================================================

    /**
     * Rotate a refresh token - creates new token and invalidates old one
     * 
     * @param oldToken The current refresh token to rotate
     * @param userId The user ID
     * @param username The username
     * @param role The user role
     * @param rememberMe Whether this is a remember-me token
     * @return New refresh token entity
     * @throws SecurityException if rotation fails security checks
     */
    @Transactional
    public RefreshTokens rotateToken(String oldToken, UUID userId, String username, String role, boolean rememberMe) {
        log.debug("Starting token rotation for user: {}", username);

        // 1. Find the old token in database
        RefreshTokens oldTokenEntity = refreshTokensRepository.findByToken(oldToken)
                .orElseThrow(() -> new SecurityException("Token not found in database"));

        // 2. Validate the old token
        validateTokenForRotation(oldTokenEntity);

        // 3. Check for token reuse (CRITICAL SECURITY CHECK)
        checkForTokenReuse(oldToken, oldTokenEntity.getTokenFamily());

        // 4. Check rotation rate limit
        checkRotationRateLimit(oldTokenEntity.getTokenFamily());

        // 5. Check rotation count limit
        if (oldTokenEntity.getRotationCount() >= maxRotationCount) {
            log.warn("Token rotation count exceeded for user: {} (count: {})", 
                    username, oldTokenEntity.getRotationCount());
            throw new SecurityException("Token rotation limit exceeded");
        }

        // 6. Generate new refresh token (JWT)
        String newRefreshTokenJwt;
        LocalDateTime expiresAt;
        
        if (rememberMe) {
            newRefreshTokenJwt = jwtService.generateRefreshToken(userId, username, role, 30); // 30 days
            expiresAt = jwtService.getRefreshTokenExpirationTime(30);
        } else {
            newRefreshTokenJwt = jwtService.generateRefreshToken(userId, username, role);
            expiresAt = jwtService.getRefreshTokenExpirationTime();
        }

        // 7. Create new token entity
        RefreshTokens newTokenEntity = new RefreshTokens();
        newTokenEntity.setUserId(userId);
        newTokenEntity.setToken(newRefreshTokenJwt);
        newTokenEntity.setExpiresAt(expiresAt);
        newTokenEntity.setRememberMe(rememberMe);
        newTokenEntity.setTokenFamily(oldTokenEntity.getTokenFamily()); // Same family
        newTokenEntity.setRotationCount(oldTokenEntity.getRotationCount() + 1); // Increment
        newTokenEntity.setPreviousToken(oldToken); // Link to old token
        newTokenEntity.setLastRotatedAt(LocalDateTime.now());

        // 8. Save new token
        newTokenEntity = refreshTokensRepository.save(newTokenEntity);

        // 9. Revoke old token
        oldTokenEntity.revoke();
        refreshTokensRepository.save(oldTokenEntity);

        log.info("Token rotated successfully for user: {} (rotation count: {})", 
                username, newTokenEntity.getRotationCount());

        return newTokenEntity;
    }

    // ============================================================================
    // REUSE DETECTION
    // ============================================================================

    /**
     * Check if a token has been reused (CRITICAL SECURITY FEATURE)
     * If an old token is used after rotation, it indicates token theft
     */
    private void checkForTokenReuse(String token, String tokenFamily) {
        // Check if this token was previously rotated (has a successor)
        Optional<RefreshTokens> successorToken = refreshTokensRepository.findByPreviousToken(token);
        
        if (successorToken.isPresent()) {
            // TOKEN REUSE DETECTED! This is a security incident
            log.error("🚨 TOKEN REUSE DETECTED! Token family: {} - Revoking entire family", tokenFamily);
            
            // Revoke entire token family
            revokeTokenFamily(tokenFamily, "Token reuse detected");
            
            throw new SecurityException("Token reuse detected - all tokens revoked");
        }
    }

    /**
     * Revoke entire token family (used when reuse is detected)
     */
    @Transactional
    public void revokeTokenFamily(String tokenFamily, String reason) {
        log.warn("Revoking token family: {} - Reason: {}", tokenFamily, reason);
        
        refreshTokensRepository.revokeTokenFamily(tokenFamily, LocalDateTime.now());
        
        // Optional: Send security alert to user
        // emailService.sendSecurityAlert(userId, "Token theft detected");
    }

    // ============================================================================
    // VALIDATION
    // ============================================================================

    /**
     * Validate token before rotation
     */
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

    // ============================================================================
    // TOKEN FAMILY MANAGEMENT
    // ============================================================================

    /**
     * Generate a new unique token family ID
     */
    public String generateTokenFamily() {
        return UUID.randomUUID().toString();
    }

    /**
     * Check if multiple tokens are active in a family (shouldn't happen)
     */
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

    /**
     * Get all tokens in a family (for debugging/auditing)
     */
    public List<RefreshTokens> getTokenFamily(String tokenFamily) {
        return refreshTokensRepository.findByTokenFamily(tokenFamily);
    }

    // ============================================================================
    // SECURITY MONITORING
    // ============================================================================

    /**
     * Find tokens with suspicious rotation patterns
     */
    public List<RefreshTokens> findSuspiciousTokens() {
        return refreshTokensRepository.findTokensWithHighRotationCount(maxRotationCount - 10);
    }

    /**
     * Get recent security incidents (tokens revoked due to reuse)
     */
    public List<RefreshTokens> getRecentSecurityIncidents(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return refreshTokensRepository.findTokensRevokedForReuse(since);
    }

    /**
     * Get total rotation count for a user
     */
    public Long getUserRotationCount(UUID userId) {
        Long count = refreshTokensRepository.getTotalRotationCountForUser(userId);
        return count != null ? count : 0L;
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    /**
     * Clean up old tokens in a family (keep only recent ones)
     */
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
