package dto;

public  class DashboardResponse {
    private String message;
    private String username;
    private String accessTime;

    public DashboardResponse(String message, String username, String accessTime) {
        this.message = message;
        this.username = username;
        this.accessTime = accessTime;
    }

    // Getters
    public String getMessage() { return message; }
    public String getUsername() { return username; }
    public String getAccessTime() { return accessTime; }
}