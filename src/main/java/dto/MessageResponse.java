
package dto;

public class MessageResponse {
    public MessageResponse(String passwordChangedSuccessfully) {
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    private String message;
    
}
