package dto;

import lombok.Data;

@Data
public class SessionInfo {
    private long activeTokens;
    private long totalRotations;

    public SessionInfo() {
    }

    public SessionInfo(long activeTokens, long totalRotations) {
        this.activeTokens = activeTokens;
        this.totalRotations = totalRotations;
    }

    public long getActiveTokens() {
        return activeTokens;
    }

    public void setActiveTokens(long activeTokens) {
        this.activeTokens = activeTokens;
    }

    public long getTotalRotations() {
        return totalRotations;
    }

    public void setTotalRotations(long totalRotations) {
        this.totalRotations = totalRotations;
    }
}
