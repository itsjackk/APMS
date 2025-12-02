
package dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UpdateProgressRequest {
    
    @NotNull(message = "Progress is required")
    @Min(value = 0, message = "Progress must be between 0 and 100")
    @Max(value = 100, message = "Progress must be between 0 and 100")
    private Integer progress;

    // Constructors
    public UpdateProgressRequest() {}

    public UpdateProgressRequest(Integer progress) {
        this.progress = progress;
    }

    // Getters and Setters
    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }
}
