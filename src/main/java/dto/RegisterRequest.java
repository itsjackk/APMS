package dto;

public class RegisterRequest {
    private String username;
    private String email;
    private String password;
    private String usernameGHUB;

    // Constructors
    public RegisterRequest() {
    }

    public RegisterRequest(String username, String email, String password, String usernameGHUB) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.usernameGHUB = usernameGHUB;
    }

    // Getters and Setters
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

    public String getUsernameGHUB() {
        return usernameGHUB;
    }

    public void setUsernameGHUB(String usernameGHUB) {
        this.usernameGHUB = usernameGHUB;
    }
}
