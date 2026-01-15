package dto;

public class AdminProjectStats {
    private Long totalProjects;
    private Long planningProjects;
    private Long inProgressProjects;
    private Long completedProjects;
    private Long onHoldProjects;
    private Long cancelledProjects;
    private Long globalProjects;
    private Long personalProjects;
    private Double averageProgress;
    private Long totalUsers;

    public AdminProjectStats(Long totalProjects, Long planningProjects, Long inProgressProjects,
                             Long completedProjects, Long onHoldProjects, Long cancelledProjects,
                             Long globalProjects, Long personalProjects, Double averageProgress,
                             Long totalUsers) {
        this.totalProjects = totalProjects;
        this.planningProjects = planningProjects;
        this.inProgressProjects = inProgressProjects;
        this.completedProjects = completedProjects;
        this.onHoldProjects = onHoldProjects;
        this.cancelledProjects = cancelledProjects;
        this.globalProjects = globalProjects;
        this.personalProjects = personalProjects;
        this.averageProgress = averageProgress;
        this.totalUsers = totalUsers;
    }

    public Long getTotalProjects() {
        return totalProjects;
    }

    public Long getPlanningProjects() {
        return planningProjects;
    }

    public Long getInProgressProjects() {
        return inProgressProjects;
    }

    public Long getCompletedProjects() {
        return completedProjects;
    }

    public Long getOnHoldProjects() {
        return onHoldProjects;
    }

    public Long getCancelledProjects() {
        return cancelledProjects;
    }

    public Long getGlobalProjects() {
        return globalProjects;
    }

    public Long getPersonalProjects() {
        return personalProjects;
    }

    public Double getAverageProgress() {
        return averageProgress;
    }

    public Long getTotalUsers() {
        return totalUsers;
    }
}