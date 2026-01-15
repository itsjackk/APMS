package dto;

public class UserStats {
    private long totalUsers;
    private long adminUsers;
    private long regularUsers;
    private long enabledUsers;
    private long disabledUsers;

    public UserStats(long totalUsers, long adminUsers, long regularUsers,
                     long enabledUsers, long disabledUsers) {
        this.totalUsers = totalUsers;
        this.adminUsers = adminUsers;
        this.regularUsers = regularUsers;
        this.enabledUsers = enabledUsers;
        this.disabledUsers = disabledUsers;
    }


    public long getTotalUsers() {
        return totalUsers;
    }

    public long getAdminUsers() {
        return adminUsers;
    }

    public long getRegularUsers() {
        return regularUsers;
    }

    public long getEnabledUsers() {
        return enabledUsers;
    }

    public long getDisabledUsers() {
        return disabledUsers;
    }
}