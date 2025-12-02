
package dto;

public class AdminStatsResponse {
    private long totalUsers;
    private long totalSystemProjects;
    private long activeSystemProjects;
    private long completedSystemProjects;

    public AdminStatsResponse(long totalUsers, long totalSystemProjects, 
                             long activeSystemProjects, long completedSystemProjects) {
        this.totalUsers = totalUsers;
        this.totalSystemProjects = totalSystemProjects;
        this.activeSystemProjects = activeSystemProjects;
        this.completedSystemProjects = completedSystemProjects;
    }

    // Getters and setters
    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }
    
    public long getTotalSystemProjects() { return totalSystemProjects; }
    public void setTotalSystemProjects(long totalSystemProjects) { this.totalSystemProjects = totalSystemProjects; }
    
    public long getActiveSystemProjects() { return activeSystemProjects; }
    public void setActiveSystemProjects(long activeSystemProjects) { this.activeSystemProjects = activeSystemProjects; }
    
    public long getCompletedSystemProjects() { return completedSystemProjects; }
    public void setCompletedSystemProjects(long completedSystemProjects) { this.completedSystemProjects = completedSystemProjects; }
}
