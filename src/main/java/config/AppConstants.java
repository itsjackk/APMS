package config;

/**
 * Application-wide constants for consistent configuration across the codebase.
 * Centralizes magic strings and numbers for easier maintenance.
 */
public final class AppConstants {

    private AppConstants() {
        // Utility class - prevent instantiation
    }

    /**
     * Authentication and Token Constants
     */
    public static class Auth {
        public static final String BEARER_PREFIX = "Bearer ";
        public static final int BEARER_PREFIX_LENGTH = 7;
        public static final String AUTHORIZATION_HEADER = "Authorization";
        public static final String REFRESH_TOKEN_COOKIE = "refreshToken";
        
        // Token expiration times (in seconds unless specified)
        public static final int REMEMBER_ME_DAYS = 30;
        public static final int STANDARD_SESSION_MINUTES = 25;
        public static final int REFRESH_TOKEN_COOKIE_MAX_AGE_REMEMBER_ME = 30 * 24 * 60 * 60; // 30 days
        public static final int REFRESH_TOKEN_COOKIE_MAX_AGE_STANDARD = 25 * 60; // 25 minutes
        
        private Auth() {}
    }

    /**
     * Cookie Configuration Constants
     */
    public static class Cookie {
        public static final boolean HTTP_ONLY = true;
        public static final boolean SECURE = true;
        public static final String PATH = "/";
        public static final String SAME_SITE = "Strict";
        public static final int EXPIRED_MAX_AGE = 0;
        
        private Cookie() {}
    }

    /**
     * Security Constants
     */
    public static class Security {
        public static final String ROLE_PREFIX = "ROLE_";
        public static final String ROLE_ADMIN = "ADMIN";
        public static final String ROLE_USER = "USER";
        
        private Security() {}
    }

    /**
     * Validation Constants
     */
    public static class Validation {
        public static final int USERNAME_MIN_LENGTH = 3;
        public static final int USERNAME_MAX_LENGTH = 100;
        public static final int PASSWORD_MIN_LENGTH = 6;
        public static final int EMAIL_MAX_LENGTH = 255;
        public static final int PROJECT_NAME_MAX_LENGTH = 100;
        public static final int PROJECT_DESCRIPTION_MAX_LENGTH = 500;
        public static final int PROGRESS_MIN = 0;
        public static final int PROGRESS_MAX = 100;
        
        private Validation() {}
    }

    /**
     * API Endpoints
     */
    public static class Endpoints {
        public static final String API_PREFIX = "/api";
        public static final String AUTH_PREFIX = "/api/auth";
        public static final String USER_PREFIX = "/api/user";
        public static final String PROJECTS_PREFIX = "/api/projects";
        public static final String ADMIN_PREFIX = "/api/admin";
        
        public static final String LOGIN = "/api/auth/login";
        public static final String REGISTER = "/api/auth/register";
        public static final String REFRESH = "/api/auth/refresh";
        public static final String LOGOUT = "/api/auth/logout";
        public static final String LOGOUT_ALL = "/api/auth/logout-all";
        public static final String VERIFY = "/api/auth/verify";
        
        public static final String CONSOLE_APP = "/ConsoleApp";
        public static final String CONSOLE_LOGIN = "/ConsoleApp/login";
        public static final String CONSOLE_DASHBOARD = "/ConsoleApp/dashboard";
        
        private Endpoints() {}
    }

    /**
     * HTTP Status Messages
     */
    public static class Messages {
        public static final String LOGIN_SUCCESSFUL = "Login successful";
        public static final String LOGOUT_SUCCESSFUL = "Logout successful";
        public static final String LOGOUT_ALL_SUCCESSFUL = "Logged out from all devices";
        public static final String TOKEN_REFRESHED = "Token refreshed successfully";
        public static final String TOKEN_REUSE_DETECTED = "Token reuse detected - all tokens revoked";
        public static final String AUTHENTICATION_FAILED = "Authentication failed";
        public static final String UNAUTHORIZED = "Unauthorized";
        public static final String ACCESS_DENIED = "Access denied. Admin privileges required.";
        
        private Messages() {}
    }

    /**
     * Database Constants
     */
    public static class Database {
        public static final String USERS_TABLE = "users";
        public static final String PROJECTS_TABLE = "projects";
        public static final String REFRESH_TOKENS_TABLE = "refresh_tokens";
        
        private Database() {}
    }

    /**
     * Scheduling Constants (in milliseconds)
     */
    public static class Scheduling {
        public static final long TOKEN_CLEANUP_INTERVAL = 120_000; // 2 minutes
        public static final long SECURITY_MONITOR_INTERVAL = 900_000; // 15 minutes
        
        private Scheduling() {}
    }
}