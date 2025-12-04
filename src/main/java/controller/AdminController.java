package controller;

import dto.AdminProjectStats;
import dto.ProjectsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import service.ProjectService;
import tables.Projects;
import tables.Users;
import repository.UserRepository;
import repository.ProjectRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "Admin management APIs")
public class AdminController {

    private final Logger log = LoggerFactory.getLogger(this.getClass());

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    // ==================== USER MANAGEMENT ====================

    @GetMapping("/users")
    public ResponseEntity<List<Users>> getAllUsers(Authentication authentication) {
        try {
            Users currentUser = getCurrentUser(authentication);

            if (!currentUser.isAdmin()) {
                log.warn("User {} attempted to access admin endpoint but is not admin. Role: {}",
                        currentUser.getUsername(), currentUser.getRole());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            List<Users> users = userRepository.findAll();
            users.forEach(user -> {
                user.setPassword(null);
            });
            return ResponseEntity.ok(users);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<Users> getUserById(
            @PathVariable UUID userId,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            if (!admin.getRole().equals(Users.Role.ADMIN)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            Optional<Users> user = userRepository.findById(userId);
            return user.map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<Users> updateUser(
            @PathVariable UUID userId,
            @RequestBody Users updatedUser,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            if (!admin.getRole().equals(Users.Role.ADMIN)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Optional<Users> existingUserOpt = userRepository.findById(userId);
            if (existingUserOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            Users existingUser = existingUserOpt.get();
            existingUser.setUsername(updatedUser.getUsername());
            existingUser.setEmail(updatedUser.getEmail());
            existingUser.setRole(updatedUser.getRole());

            Users saved = userRepository.save(existingUser);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable UUID userId,
            Authentication authentication) {
        try {
            Users currentUser = getCurrentUser(authentication);
            if (!currentUser.isAdmin()) {
                log.warn("User {} attempted to access admin endpoint but is not admin. Role: {}",
                        currentUser.getUsername(), currentUser.getRole());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Don't allow admin to delete themselves
            if (currentUser.getId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }

            userRepository.deleteById(userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    // ==================== PROJECT MANAGEMENT ====================

    @GetMapping("/projects")
    public ResponseEntity<List<ProjectsResponse>> getAllProjects(Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            List<Projects> projects = projectService.getAllProjectsForAdmin(admin);

            List<ProjectsResponse> responses = projects.stream()
                    .map(project -> {
                        String createdByName = project.getCreatedBy() != null ?
                                project.getCreatedBy().getUsername() : "Unknown";
                        String assignedToName = "Not assigned";

                        if (project.getAssignedTo() != null) {
                            Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                            assignedToName = assignedUser.map(Users::getUsername).orElse("Not assigned");
                        }

                        ProjectsResponse response = ProjectsResponse.fromEntity(project, createdByName, assignedToName);

                        // Explicitly ensure isGlobal is set correctly
                        response.setGlobal(project.getIsGlobal() != null ? project.getIsGlobal() : false);

                        response.setType(response.isGlobal() ? "global" : "personal");
                        return response;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ProjectsResponse> getProjectById(
            @PathVariable UUID projectId,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            Optional<ProjectsResponse> projectOpt = projectService.getProjectByIdForAdmin(projectId, admin);
            return projectOpt.map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @PutMapping("/projects/{projectId}")
    public ResponseEntity<ProjectsResponse> updateProject(
            @PathVariable UUID projectId,
            @RequestBody Map<String, Object> updates,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);

            Optional<Projects> projectOpt = projectRepository.findById(projectId);
            if (projectOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            Projects project = projectOpt.get();

            if (updates.containsKey("name")) {
                project.setName((String) updates.get("name"));
            }
            if (updates.containsKey("description")) {
                project.setDescription((String) updates.get("description"));
            }
            if (updates.containsKey("status")) {
                project.setStatus(Projects.ProjectStatus.valueOf((String) updates.get("status")));
            }
            if (updates.containsKey("priority")) {
                project.setPriority(Projects.ProjectPriority.valueOf((String) updates.get("priority")));
            }
            if (updates.containsKey("progress")) {
                project.setProgress(((Number) updates.get("progress")).intValue());
            }
            if (updates.containsKey("isGlobal")) {
                project.setIsGlobal((Boolean) updates.get("isGlobal"));
            }
            if (updates.containsKey("assignedUserId")) {
                String assignedUserIdStr = (String) updates.get("assignedUserId");
                if (assignedUserIdStr != null && !assignedUserIdStr.isEmpty()) {
                    project.setAssignedTo(UUID.fromString(assignedUserIdStr));
                } else {
                    project.setAssignedTo(null);
                }
            }
            Projects updated = projectService.updateProjectAsAdmin(projectId, project, admin);

            String creatorUsername = updated.getCreatedBy() != null ? updated.getCreatedBy().getUsername() : null;
            String assignedUsername = null;
            if (updated.getAssignedTo() != null) {
                Optional<Users> assignedUser = userRepository.findById(updated.getAssignedTo());
                assignedUsername = assignedUser.map(Users::getUsername).orElse(null);
            }

            return ResponseEntity.ok(ProjectsResponse.fromEntity(updated, creatorUsername, assignedUsername));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID projectId,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            projectService.deleteProjectAsAdmin(projectId, admin);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/projects/statistics")
    public ResponseEntity<AdminProjectStats> getStatistics(Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            AdminProjectStats stats = projectService.getAdminProjectStats(admin);
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/projects/status/{status}")
    public ResponseEntity<List<ProjectsResponse>> getProjectsByStatus(
            @PathVariable Projects.ProjectStatus status,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            List<ProjectsResponse> projects = projectService.getProjectsByStatus(status, admin);
            return ResponseEntity.ok(projects);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/projects/user/{userId}")
    public ResponseEntity<List<ProjectsResponse>> getProjectsByUser(
            @PathVariable UUID userId,
            Authentication authentication) {
        try {
            Users admin = getCurrentUser(authentication);
            List<ProjectsResponse> projects = projectService.getProjectsByUser(userId, admin);
            return ResponseEntity.ok(projects);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    // ==================== ADMIN STATISTICS ====================

    @Operation(summary = "Get admin statistics")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats(Authentication authentication) {
        try {
            Users user = getCurrentUser(authentication);
            if (!user.isAdmin()) {
                log.warn("User {} attempted to access admin endpoint but is not admin. Role: {}",
                        user.getUsername(), user.getRole());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            long totalUsers = userRepository.count();

            AdminProjectStats stats = projectService.getAdminProjectStats(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting project stats", e);
            log.error("Exception type: {}", e.getClass().getName());
            log.error("Exception message: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/users/stats")
    @Operation(summary = "Get user statistics", description = "Get statistics about users (admin only)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUserStats(Authentication authentication) {
        log.info("Getting user statistics");

        try {
            Users currentUser = getCurrentUser(authentication);

            if (!currentUser.isAdmin()) {
                log.warn("Non-admin user '{}' attempted to access user statistics", currentUser.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Admin privileges required."));
            }

            List<Users> allUsers = userRepository.findAll();

            long totalUsers = allUsers.size();
            long adminUsers = allUsers.stream()
                    .filter(Users::isAdmin)
                    .count();
            long regularUsers = totalUsers - adminUsers;

            Map<String, Object> stats = Map.of(
                    "totalUsers", totalUsers,
                    "adminUsers", adminUsers,
                    "regularUsers", regularUsers
            );

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("Error getting user statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve user statistics"));
        }
    }

    @PutMapping("/users/{userId}/role")
    @Operation(summary = "Update user role", description = "Update a user's role (admin only)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> updateUserRole(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> roleUpdate,
            Authentication authentication) {
        log.info("Updating role for user: {}", userId);

        try {
            Users currentUser = getCurrentUser(authentication);

            if (!currentUser.isAdmin()) {
                log.warn("Non-admin user '{}' attempted to update user role", currentUser.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Admin privileges required."));
            }

            Optional<Users> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                log.warn("User not found with ID: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            Users user = userOpt.get();
            String newRole = roleUpdate.get("role");

            if (!"USER".equals(newRole) && !"ADMIN".equals(newRole)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid role. Must be USER or ADMIN"));
            }

            Users.Role role = Users.Role.valueOf(newRole);
            user.setRole(role);
            userRepository.save(user);

            log.info("User role updated successfully for user: {}", user.getUsername());
            return ResponseEntity.ok(user);

        } catch (Exception e) {
            log.error("Error updating user role", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update user role"));
        }
    }

    // ==================== HELPER METHODS ====================

    private Users getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
