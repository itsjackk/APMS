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

    // Constructors
    public RefreshTokens() {
        this.createdAt = LocalDateTime.now();
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

    // Methods
    public boolean isValid() {
        return !this.isRevoked && !this.isExpired();
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public void revoke() {
        this.isRevoked = true;
    }

    // Getters and Setters
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
}