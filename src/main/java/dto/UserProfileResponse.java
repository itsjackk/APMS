package dto;


import tables.Users;

import java.time.LocalDateTime;

public class UserProfileResponse {

    private String username;
    private String usernameGHUB;
    private String email;
    private Users.Role role;
    private java.time.LocalDateTime createdAt;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Users.Role getRole() {
        return role;
    }

    public void setRole(Users.Role role) {
        this.role = role;
    }

    public String getUsernameGHUB() {
        return usernameGHUB;
    }

    public void setUsernameGHUB(String usernameGHUB) {
        this.usernameGHUB = usernameGHUB;
    }

    public UserProfileResponse(String username,String usernameGHUB, String email, Users.Role role, java.time.LocalDateTime createdAt) {
        this.username = username;
        this.usernameGHUB = usernameGHUB;
        this.email = email;
        this.role = role;
        this.createdAt = createdAt;
    }
}