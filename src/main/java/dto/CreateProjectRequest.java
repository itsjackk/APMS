
package dto;

import tables.Projects;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public class CreateProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 100, message = "Project name must not exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private Projects.ProjectStatus status;
    private Projects.ProjectPriority priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer progress;

    // New fields for admin functionality
    private String projectType; // "personal" or "global"
    private UUID assignedUserId; // For global project assignment

    // Constructors
    public CreateProjectRequest() {
    }

    public CreateProjectRequest(String name, String description, Projects.ProjectStatus status,
                                Projects.ProjectPriority priority, LocalDate startDate, LocalDate endDate,
                                Integer progress, String projectType, UUID assignedUserId) {
        this.name = name;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.startDate = startDate;
        this.endDate = endDate;
        this.progress = progress;
        this.projectType = projectType;
        this.assignedUserId = assignedUserId;
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Projects.ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(Projects.ProjectStatus status) {
        this.status = status;
    }

    public Projects.ProjectPriority getPriority() {
        return priority;
    }

    public void setPriority(Projects.ProjectPriority priority) {
        this.priority = priority;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public String getProjectType() {
        return projectType;
    }

    public void setProjectType(String projectType) {
        this.projectType = projectType;
    }

    public UUID getAssignedUserId() {
        return assignedUserId;
    }

    public void setAssignedUserId(UUID assignedUserId) {
        this.assignedUserId = assignedUserId;
    }
}
