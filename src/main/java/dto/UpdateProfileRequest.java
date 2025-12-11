package dto;

public class UpdateProfileRequest {

    private String usernameGHUB;
    private String email;


    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String usernameGHUB, String email) {
        this.usernameGHUB = usernameGHUB;
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsernameGHUB() {
        return usernameGHUB;
    }

    public void setUsernameGHUB(String usernameGHUB) {
        this.usernameGHUB = usernameGHUB;
    }
}
