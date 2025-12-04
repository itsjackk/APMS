package dto;

public class ProjectStats {
    private Long totalProjects;
    private Long planningProjects;
    private Long inProgressProjects;
    private Long completedProjects;
    private Long onHoldProjects;

    public ProjectStats(Long totalProjects, Long planningProjects, Long inProgressProjects,
                        Long completedProjects, Long onHoldProjects) {
        this.totalProjects = totalProjects;
        this.planningProjects = planningProjects;
        this.inProgressProjects = inProgressProjects;
        this.completedProjects = completedProjects;
        this.onHoldProjects = onHoldProjects;
    }

    // Getters
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
}
