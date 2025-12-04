
package controller;

import dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import repository.UserRepository;
import service.UserService;
import tables.Users;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
@Tag(name = "User", description = "User management APIs")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    @Autowired
    private UserRepository usersRepository;

    @Autowired
    private UserService userService;

    @Operation(summary = "Get user profile", description = "Get the profile of the authenticated user")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            Optional<Users> userOpt = usersRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                log.info("User not found: {}", username);
                return ResponseEntity.notFound().build();
            }

            Users user = userOpt.get();
            return ResponseEntity.ok(new UserProfileResponse(
                    user.getUsername(),
                    user.getUsernameGHUB(),
                    user.getEmail(),
                    user.getRole(),
                    user.getCreatedAt()
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Failed to get user profile", e.getMessage()));
        }
    }

    @Operation(summary = "Update user profile", description = "Update the email of the authenticated user")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid email or email already exists"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(@RequestBody UpdateProfileRequest request, Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            if (user == null) {
                log.warn("User not found from authentication");
                return ResponseEntity.notFound().build();
            }

            boolean hasChanges = false;

            if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
                if (!request.getEmail().equals(user.getEmail())) {
                    Optional<Users> existingUser = usersRepository.findByEmail(request.getEmail());
                    if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                        log.warn("Email already exists: {}", request.getEmail());
                        return ResponseEntity.badRequest()
                                .body(new ErrorResponse("Email update failed", "Email already exists"));
                    }

                    user.setEmail(request.getEmail());
                    hasChanges = true;
                }
            }

            if (request.getUsernameGHUB() != null && !request.getUsernameGHUB().trim().isEmpty()) {
                if (!request.getUsernameGHUB().equals(user.getUsernameGHUB())) {
                    Optional<Users> existingUser = usersRepository.findByUsernameGHUB(request.getUsernameGHUB());
                    if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                        log.warn("Username already exists: {}", request.getUsernameGHUB());
                        return ResponseEntity.badRequest()
                                .body(new ErrorResponse("Username update failed", "Username already exists"));
                    }

                    user.setUsernameGHUB(request.getUsernameGHUB());
                    hasChanges = true;
                }
            }

            Users updatedUser = user;
            if (hasChanges) {
                user.setUpdatedAt(LocalDateTime.now());
                updatedUser = usersRepository.save(user);
                log.info("User profile updated successfully: {}", user.getUsername());
            } else {
                log.info("No changes detected for user profile: {}", user.getUsername());
            }

            return ResponseEntity.ok(new UserProfileResponse(
                    updatedUser.getUsername(),
                    updatedUser.getUsernameGHUB(),
                    updatedUser.getEmail(),
                    updatedUser.getRole(),
                    updatedUser.getCreatedAt()
            ));

        } catch (Exception e) {
            log.error("Error updating user profile", e);
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Failed to update user profile", e.getMessage()));
        }
    }

    @Operation(summary = "Change user password", description = "Change the password of the authenticated user")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Password changed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid current password or new password"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            if (user == null) {
                log.warn("User not found from authentication");
                return ResponseEntity.notFound().build();
            }
            if (request.getCurrentPassword() == null || request.getCurrentPassword().trim().isEmpty()) {
                log.warn("Current password is required");
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Password change failed", "Current password is required"));
            }
            if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
                log.warn("New password is required");
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Password change failed", "New password is required"));
            }
            if (request.getNewPassword().length() < 6) {
                log.warn("New password is too short");
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Password change failed", "New password must be at least 6 characters long"));
            }
            if (!userService.verifyPassword(user, request.getCurrentPassword())) {
                log.warn("Current password is incorrect for user: {}", user.getUsername());
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Password change failed", "Current password is incorrect"));
            }
            if (request.getCurrentPassword().equals(request.getNewPassword())) {
                log.warn("New password is same as current password");
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Password change failed", "New password must be different from current password"));
            }
            userService.updatePassword(user, request.getNewPassword());
            log.info("Password changed successfully for user: {}", user.getUsername());

            return ResponseEntity.ok(new MessageResponse("Password changed successfully"));

        } catch (Exception e) {
            log.error("Error changing password", e);
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Failed to change password", e.getMessage()));
        }
    }
}