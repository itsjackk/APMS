
package dto;

public class RefreshResponse {
    private String accessToken;
    private String message;

    // Constructors
    public RefreshResponse() {}

    public RefreshResponse(String accessToken, String message) {
        this.accessToken = accessToken;
        this.message = message;
    }

    // Getters and Setters
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
