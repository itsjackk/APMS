
package dto;

public class LoginResponse {
    private String accessToken;
    private String username;
    private String message;

    // Constructors
    public LoginResponse() {
    }

    public LoginResponse(String accessToken, String username, String message) {
        this.accessToken = accessToken;
        this.username = username;
        this.message = message;
    }

    // Getters and Setters
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
