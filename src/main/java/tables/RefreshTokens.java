package tables;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshTokens {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token", nullable = false, unique = true, length = 1000)
    private String token;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "is_revoked", nullable = false)
    private boolean isRevoked = false;

    @Column(name = "remember_me", nullable = false)
    private boolean rememberMe = false;


    @Column(name = "token_family", nullable = false)
    private String tokenFamily;

    @Column(name = "rotation_count", nullable = false)
    private Integer rotationCount = 0;

    @Column(name = "last_rotated_at")
    private LocalDateTime lastRotatedAt;

    @Column(name = "previous_token", length = 1000)
    private String previousToken;

    @Column(name = "revoked_due_to_reuse", nullable = false)
    private boolean revokedDueToReuse = false;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public RefreshTokens() {
        this.createdAt = LocalDateTime.now();
        this.rotationCount = 0;
        this.revokedDueToReuse = false;
    }

    public RefreshTokens(UUID userId, String token, LocalDateTime expiresAt) {
        this();
        this.userId = userId;
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public RefreshTokens(UUID userId, String token, LocalDateTime expiresAt, boolean rememberMe) {
        this(userId, token, expiresAt);
        this.rememberMe = rememberMe;
    }

    // New constructor with token family
    public RefreshTokens(UUID userId, String token, LocalDateTime expiresAt, boolean rememberMe, String tokenFamily) {
        this(userId, token, expiresAt, rememberMe);
        this.tokenFamily = tokenFamily;
    }

    public boolean isValid() {
        return !this.isRevoked && !this.isExpired();
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public void revoke() {
        this.isRevoked = true;
        this.revokedAt = LocalDateTime.now();
    }

    /**
     * Revoke token due to reuse detection
     */
    public void revokeForReuse() {
        this.isRevoked = true;
        this.revokedDueToReuse = true;
        this.revokedAt = LocalDateTime.now();
    }

    /**
     * Increment rotation count and update timestamp
     */
    public void incrementRotation() {
        this.rotationCount++;
        this.lastRotatedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isRevoked() {
        return isRevoked;
    }

    public void setRevoked(boolean revoked) {
        isRevoked = revoked;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isRememberMe() {
        return rememberMe;
    }

    public void setRememberMe(boolean rememberMe) {
        this.rememberMe = rememberMe;
    }

    public String getTokenFamily() {
        return tokenFamily;
    }

    public void setTokenFamily(String tokenFamily) {
        this.tokenFamily = tokenFamily;
    }

    public Integer getRotationCount() {
        return rotationCount;
    }

    public void setRotationCount(Integer rotationCount) {
        this.rotationCount = rotationCount;
    }

    public LocalDateTime getLastRotatedAt() {
        return lastRotatedAt;
    }

    public void setLastRotatedAt(LocalDateTime lastRotatedAt) {
        this.lastRotatedAt = lastRotatedAt;
    }

    public String getPreviousToken() {
        return previousToken;
    }

    public void setPreviousToken(String previousToken) {
        this.previousToken = previousToken;
    }

    public boolean isRevokedDueToReuse() {
        return revokedDueToReuse;
    }

    public void setRevokedDueToReuse(boolean revokedDueToReuse) {
        this.revokedDueToReuse = revokedDueToReuse;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }
}
