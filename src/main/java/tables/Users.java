package tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_username", columnList = "username", unique = true),
    @Index(name = "idx_users_email", columnList = "email", unique = true),
    @Index(name = "idx_users_username_ghub", columnList = "username_ghub"),
    @Index(name = "idx_users_role", columnList = "role"),
    @Index(name = "idx_users_enabled", columnList = "enabled")
})
@Getter
@Setter
@NoArgsConstructor
public class Users {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "username", length = 100, nullable = false, unique = true)
    private String username;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role = Role.USER;

    @Column(name = "username_ghub", nullable = true, unique = true)
    private String usernameGHUB;

    public enum Role {
        USER, ADMIN
    }

    public Users(String username, String email, String password, String usernameGHUB) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.usernameGHUB = usernameGHUB;
    }

    public Users(String username, String email, String password, Role role, String usernameGHUB) {
        this(username, email, password, usernameGHUB);
        this.role = role;
    }

    public boolean isAccountEnabled() {
        return this.enabled != null && this.enabled;
    }

    public boolean isAdmin() {
        return this.role == Role.ADMIN;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Users user = (Users) obj;
        return Objects.equals(id, user.id);
    }
}