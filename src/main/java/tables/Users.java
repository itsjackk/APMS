
package tables;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.Objects;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Entity
@Table(name = "users")
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
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role = Role.USER;

    // Updated to match your new database column name
    @Column(name = "username_ghub", nullable = true, unique = true)
    private String usernameGHUB;

    // Enum for roles
    public enum Role {
        USER, ADMIN
    }

    // Constructors
    public Users() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Users(String username, String email, String password, String usernameGHUB) {
        this();
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = Role.USER;
        this.usernameGHUB = usernameGHUB;
    }

    public Users(String username, String email, String password, Role role, String usernameGHUB) {
        this(username, email, password, usernameGHUB);
        this.role = role;
    }

    // Methods
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

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUsernameGHUB() {
        return usernameGHUB;
    }

    public void setUsernameGHUB(String usernameGHUB) {
        this.usernameGHUB = usernameGHUB;
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
