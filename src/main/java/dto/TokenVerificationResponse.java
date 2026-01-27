package dto;

import lombok.Data;

@Data
public class TokenVerificationResponse {

    private boolean valid;
    private String username;
    private String role;
    private String message;

    public TokenVerificationResponse(boolean valid, String username, String role, String message) {
        this.valid = valid;
        this.username = username;
        this.role = role;
        this.message = message;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}