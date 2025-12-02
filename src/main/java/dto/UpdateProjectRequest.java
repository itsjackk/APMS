package dto;
import tables.Projects;

public  class UpdateProjectRequest {
    private String name;
    private String description;
    private Projects.ProjectStatus status;
    private Projects.ProjectPriority priority;
    private Integer progress;
    private String startDate; // Changed from LocalDateTime to String
    private String endDate;   // Changed from LocalDateTime to String

    // Constructors
    public UpdateProjectRequest() {}

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Projects.ProjectStatus getStatus() { return status; }
    public void setStatus(Projects.ProjectStatus status) { this.status = status; }

    public Projects.ProjectPriority getPriority() { return priority; }
    public void setPriority(Projects.ProjectPriority priority) { this.priority = priority; }

    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
}