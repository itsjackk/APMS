package tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens", indexes = {
    @Index(name = "idx_refresh_tokens_user_id", columnList = "user_id"),
    @Index(name = "idx_refresh_tokens_token_family", columnList = "token_family"),
    @Index(name = "idx_refresh_tokens_expires_at", columnList = "expires_at"),
    @Index(name = "idx_refresh_tokens_previous_token", columnList = "previous_token")
})
@Getter
@Setter
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

    public void revokeForReuse() {
        this.isRevoked = true;
        this.revokedDueToReuse = true;
        this.revokedAt = LocalDateTime.now();
    }

    public void incrementRotation() {
        this.rotationCount++;
        this.lastRotatedAt = LocalDateTime.now();
    }
}
