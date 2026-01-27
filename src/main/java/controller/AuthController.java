package controller;

import dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import repository.UserRepository;
import service.AuthenticationService;
import service.JwtService;
import service.TokenRotationService;
import tables.Users;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Authentication management APIs")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationService authenticationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TokenRotationService tokenRotationService;

    @Operation(summary = "Register new user", description = "Register a new user account")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User registered successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input or user already exists"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        try {
            log.info("Registration attempt for username: {}", registerRequest.getUsername());

            // Create new user - let database constraints handle uniqueness
            Users newUser = new Users();
            newUser.setUsername(registerRequest.getUsername());
            newUser.setEmail(registerRequest.getEmail());
            newUser.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
            newUser.setRole(Users.Role.USER);
            newUser.setEnabled(true);
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setUpdatedAt(LocalDateTime.now());

            if (registerRequest.getUsernameGHUB() != null && !registerRequest.getUsernameGHUB().trim().isEmpty()) {
                newUser.setUsernameGHUB(registerRequest.getUsernameGHUB());
            }

            userRepository.save(newUser);
            log.info("User registered successfully: {}", registerRequest.getUsername());

            return ResponseEntity.ok(Map.of(
                    "message", "User registered successfully",
                    "username", newUser.getUsername()
            ));

        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation during registration: {}", e.getMessage());

            String errorMessage = e.getMessage().toLowerCase();
            if (errorMessage.contains("username")) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "error", "Username already exists",
                                "message", "This username is already taken. Please choose a different username."
                        ));
            } else if (errorMessage.contains("email")) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "error", "Email already exists",
                                "message", "This email is already registered. Please use a different email address."
                        ));
            } else if (errorMessage.contains("username_ghub")) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "error", "GitHub username already exists",
                                "message", "This GitHub username is already taken. Please use a different GitHub username."
                        ));
            }

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "Registration failed",
                            "message", "A user with these details already exists. Please check your input."
                    ));

        } catch (Exception e) {
            log.error("Unexpected error during registration", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Registration failed",
                            "message", "An unexpected error occurred. Please try again later."
                    ));
        }
    }

    @Operation(summary = "Login user with Remember Me support")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Login successful"),
            @ApiResponse(responseCode = "401", description = "Authentication failed")
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        try {
            log.info("Login attempt for user: {} (Remember Me: {})",
                    loginRequest.getUsername(),
                    loginRequest.isRememberMe());

            AuthenticationResponse authResponse = authenticationService.login(
                    loginRequest.getUsername(),
                    loginRequest.getPassword(),
                    loginRequest.isRememberMe()
            );

            Cookie refreshTokenCookie = new Cookie("refreshToken", authResponse.getRefreshToken());
            refreshTokenCookie.setHttpOnly(true);
            refreshTokenCookie.setSecure(true);
            refreshTokenCookie.setPath("/");
            refreshTokenCookie.setAttribute("SameSite", "Strict");

            if (loginRequest.isRememberMe()) {
                refreshTokenCookie.setMaxAge(30 * 24 * 60 * 60); // 30 days
                log.info("Setting refresh token cookie with 30-day expiration for user: {}",
                        loginRequest.getUsername());
            } else {
                refreshTokenCookie.setMaxAge(25 * 60); // 25 minutes
                log.info("Setting refresh token cookie with 25 minutes expiration for user: {}",
                        loginRequest.getUsername());
            }

            response.addCookie(refreshTokenCookie);

            log.info("Login successful for user: {}", authResponse.getUsername());

            return ResponseEntity.ok(new LoginResponse(
                    authResponse.getAccessToken(),
                    authResponse.getUsername(),
                    "Login successful"
            ));

        } catch (Exception e) {
            log.error("Login failed for user: {} - {}",
                    loginRequest.getUsername(),
                    e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Authentication failed", e.getMessage()));
        }
    }

    @Operation(summary = "Refresh access token with automatic rotation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
            @ApiResponse(responseCode = "401", description = "Invalid or reused refresh token"),
            @ApiResponse(responseCode = "403", description = "Token reuse detected - all tokens revoked")
    })
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);

            if (refreshToken == null) {
                log.warn("Refresh token request with missing token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Refresh token not found", "No refresh token provided"));
            }

            log.info("Processing refresh token request with rotation");

            // This will handle token rotation automatically
            AuthenticationResponse authResponse = authenticationService.refreshToken(refreshToken);

            // Update refresh token cookie with the NEW rotated token
            Cookie refreshTokenCookie = new Cookie("refreshToken", authResponse.getRefreshToken());
            refreshTokenCookie.setHttpOnly(true);
            refreshTokenCookie.setSecure(true);
            refreshTokenCookie.setPath("/");
            refreshTokenCookie.setAttribute("SameSite", "Strict");

            // Preserve cookie expiration based on token type
            boolean isRememberMe = jwtService.isRememberMeToken(refreshToken);

            if (isRememberMe) {
                refreshTokenCookie.setMaxAge(30 * 24 * 60 * 60); // 30 days
                log.info("Refreshing remember-me token for user: {}", authResponse.getUsername());
            } else {
                refreshTokenCookie.setMaxAge(25 * 60); // 25 minutes
                log.info("Refreshing standard token for user: {}", authResponse.getUsername());
            }

            response.addCookie(refreshTokenCookie);

            log.info("Token refresh successful with rotation for user: {}", authResponse.getUsername());

            return ResponseEntity.ok(new RefreshResponse(
                    authResponse.getAccessToken(),
                    "Token refreshed successfully"
            ));

        } catch (IllegalStateException e) {
            log.error("TOKEN REUSE DETECTED: {}", e.getMessage());

            Cookie refreshTokenCookie = new Cookie("refreshToken", "");
            refreshTokenCookie.setHttpOnly(true);
            refreshTokenCookie.setSecure(true);
            refreshTokenCookie.setPath("/");
            refreshTokenCookie.setMaxAge(0);
            response.addCookie(refreshTokenCookie);

            // Return forbidden response
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Token reuse detected", "Your session has been terminated for security reasons."));
        } catch (Exception e) {
            log.error("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Token refresh failed", e.getMessage()));
        }
    }

    @Operation(summary = "Logout user")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            java.util.UUID userId = jwtService.extractUserId(refreshToken);

            if (refreshToken != null) {
                authenticationService.logout(refreshToken);
                log.info("Revoked refresh token");
            }
            authenticationService.logoutAllDevices(userId);
            Cookie refreshTokenCookie = new Cookie("refreshToken", "");
            refreshTokenCookie.setHttpOnly(true);
            refreshTokenCookie.setSecure(true);
            refreshTokenCookie.setPath("/");
            refreshTokenCookie.setMaxAge(0);
            response.addCookie(refreshTokenCookie);
            authenticationService.cleanupExpiredTokens();
            log.info("Cleaned up expired and revoked tokens");

            return ResponseEntity.ok(new LogoutResponse("Logout successful"));

        } catch (Exception e) {
            log.error("Logout failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Logout failed", e.getMessage()));
        }
    }

    @Operation(summary = "Logout from all devices")
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAllDevices(HttpServletRequest request, HttpServletResponse response) {
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);

            if (refreshToken == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Unauthorized", "No refresh token provided"));
            }

            java.util.UUID userId = jwtService.extractUserId(refreshToken);
            authenticationService.logoutAllDevices(userId);
            log.info("Revoked all tokens for user: {}", userId);

            Cookie refreshTokenCookie = new Cookie("refreshToken", "");
            refreshTokenCookie.setHttpOnly(true);
            refreshTokenCookie.setSecure(true);
            refreshTokenCookie.setPath("/");
            refreshTokenCookie.setMaxAge(0);
            response.addCookie(refreshTokenCookie);

            authenticationService.cleanupExpiredTokens();
            log.info("Cleaned up all revoked tokens for user: {}", userId);

            return ResponseEntity.ok(new LogoutResponse("Logged out from all devices"));

        } catch (Exception e) {
            log.error("Logout all failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Logout all failed", e.getMessage()));
        }
    }

    @Operation(summary = "Access dashboard")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/dashboard")
    public ResponseEntity<?> accessDashboard() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            // Log dashboard access with user info
            log.info("User " + username + " accessed dashboard at " + java.time.LocalDateTime.now());

            return ResponseEntity.ok(new DashboardResponse(
                    "Dashboard accessed successfully",
                    username,
                    java.time.LocalDateTime.now().toString()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Dashboard access failed", e.getMessage()));
        }
    }


    @Operation(summary = "Verify access token validity")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Token is valid"),
            @ApiResponse(responseCode = "401", description = "Token is invalid or revoked")
    })
    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken(HttpServletRequest request) {
        try {
            // Extract access token from Authorization header
            String token = extractTokenFromRequest(request);

            if (token == null) {
                log.warn("No token provided for verification");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("No token provided", "Authorization header missing"));
            }

            // Extract username first (this will throw if token is invalid)
            String username;
            try {
                username = jwtService.extractUsername(token);
            } catch (Exception e) {
                log.warn("Failed to extract username from token: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Invalid token", "Token is malformed or invalid"));
            }

            // Validate token signature, expiration, and type
            if (!jwtService.isAccessTokenValid(token, username)) {
                log.warn("Invalid or expired access token for user: {}", username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Invalid token", "Token is expired or invalid"));
            }

            // Check if user still exists
            Optional<Users> userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                log.warn("User not found for token: {}", username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("User not found", "User no longer exists"));
            }

            Users user = userOpt.get();

            log.info("Token verified successfully for user: {}", username);

            return ResponseEntity.ok(new TokenVerificationResponse(
                    true,
                    username,
                    user.getRole().name(),
                    "Token is valid"
            ));

        } catch (Exception e) {
            log.error("Token verification failed", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Verification failed", e.getMessage()));
        }
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }

    private String extractRefreshTokenFromCookies(HttpServletRequest request) {
        if (request.getCookies() != null) {
            Optional<Cookie> refreshTokenCookie = Arrays.stream(request.getCookies())
                    .filter(cookie -> "refreshToken".equals(cookie.getName()))
                    .findFirst();

            if (refreshTokenCookie.isPresent()) {
                return refreshTokenCookie.get().getValue();
            }
        }
        return null;
    }
}