package dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import tables.Projects;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class ProjectsResponse {
    private UUID id;
    private String name;
    private String description;
    private Projects.ProjectStatus status;
    private Projects.ProjectPriority priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer progress;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdByName;
    private String assignedToName;

    @JsonProperty("isGlobal")  // Ensure this is serialized as "isGlobal"
    private boolean isGlobal;

    private String owner;
    private String type;

    public ProjectsResponse() {
    }

    public ProjectsResponse(UUID id, String name, String description, Projects.ProjectStatus status,
                            Projects.ProjectPriority priority, LocalDate startDate, LocalDate endDate,
                            Integer progress, LocalDateTime createdAt, LocalDateTime updatedAt,
                            String createdByName, String assignedToName, boolean isGlobal) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.startDate = startDate;
        this.endDate = endDate;
        this.progress = progress;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdByName = createdByName;
        this.assignedToName = assignedToName;
        this.isGlobal = isGlobal;
        this.type = isGlobal ? "global" : "personal";
        this.owner = createdByName;
    }

    public static ProjectsResponse fromEntity(Projects project, String createdByName, String assignedToName) {
        boolean isGlobalValue = project.getIsGlobal() != null ? project.getIsGlobal() : false;

        ProjectsResponse response = new ProjectsResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getStatus(),
                project.getPriority(),
                project.getStartDate(),
                project.getEndDate(),
                project.getProgress(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                createdByName,
                assignedToName,
                isGlobalValue
        );

        return response;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCreatedByName() {
        return createdByName;
    }

    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }

    public String getAssignedToName() {
        return assignedToName;
    }

    public void setAssignedToName(String assignedToName) {
        this.assignedToName = assignedToName;
    }

    @JsonProperty("isGlobal")
    public boolean isGlobal() {
        return isGlobal;
    }

    @JsonProperty("isGlobal")
    public void setGlobal(boolean global) {
        this.isGlobal = global;
        this.type = global ? "global" : "personal";
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
