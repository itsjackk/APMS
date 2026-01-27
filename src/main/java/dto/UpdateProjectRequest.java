package dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tables.Projects;

/**
 * Request DTO for updating a project.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProjectRequest {

    @Size(max = 100, message = "Project name must not exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private Projects.ProjectStatus status;
    private Projects.ProjectPriority priority;

    @Min(value = 0, message = "Progress must be between 0 and 100")
    @Max(value = 100, message = "Progress must be between 0 and 100")
    private Integer progress;

    private String startDate; // ISO-8601 date format (YYYY-MM-DD)
    private String endDate;   // ISO-8601 date format (YYYY-MM-DD)
}