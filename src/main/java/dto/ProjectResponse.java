package dto;

import lombok.Data;
import tables.Projects;

@Data
public class ProjectResponse {
    private String message;
    private Projects project;

    public ProjectResponse() {
    }

    public ProjectResponse(String message, Projects project) {
        this.message = message;
        this.project = project;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Projects getProject() {
        return project;
    }

    public void setProject(Projects project) {
        this.project = project;
    }
}
