
package dto;

public class LogoutResponse {
    private String message;

    // Constructors
    public LogoutResponse() {}

    public LogoutResponse(String message) {
        this.message = message;
    }

    // Getters and Setters
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
