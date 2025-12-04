
package controller;

import dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import repository.UserRepository;
import service.ProjectService;
import service.UserService;
import service.GitHubService;
import tables.Projects;
import tables.Users;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;


@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private static Logger log = LoggerFactory.getLogger(ProjectController.class);
    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GitHubService gitHubService;

    @GetMapping
    public ResponseEntity<List<ProjectsResponse>> getUserProjects(Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            try {
                gitHubService.autoSyncGitHubProjects(user);
            } catch (Exception e) {
                log.warn("GitHub sync failed for user {}: {}", user.getUsername(), e.getMessage());
            }

            List<ProjectsResponse> projects = projectService.getAccessibleProjectsForUser(user);
            return ResponseEntity.ok(projects);

        } catch (Exception e) {
            log.error("Error fetching projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/projects-updated")
    public ResponseEntity<List<ProjectResponseGhub>> getUserProjectsUpdated(Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            try {
                gitHubService.autoSyncGitHubProjects(user);
            } catch (Exception e) {
                log.warn("GitHub sync failed for user {}: {}", user.getUsername(), e.getMessage());
            }

            List<ProjectResponseGhub> projects = projectService.getAccessibleProjectsForUserGhub(user);
            return ResponseEntity.ok(projects);

        } catch (Exception e) {
            log.error("Error fetching projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/personal")
    public ResponseEntity<List<Projects>> getUserPersonalProjects(Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            List<Projects> projects = projectService.getUserPersonalProjects(user);
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/assigned")
    public ResponseEntity<List<Projects>> getUserAssignedGlobalProjects(Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            List<Projects> projects = projectService.getUserAssignedGlobalProjects(user);
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/global")
    public ResponseEntity<List<Projects>> getAllGlobalProjects(Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            if (!user.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            List<Projects> projects = projectService.getAllGlobalProjects(user);
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/personal")
    public ResponseEntity<ProjectResponse> createPersonalProject(
            @RequestBody @Valid CreateProjectRequest request,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            Projects project = projectService.createPersonalProject(
                    request.getName(),
                    request.getDescription(),
                    user,
                    request.getStatus() != null ? request.getStatus() : Projects.ProjectStatus.PLANNING,
                    request.getPriority() != null ? request.getPriority() : Projects.ProjectPriority.MEDIUM,
                    request.getStartDate(),
                    request.getEndDate(),
                    request.getProgress() != null ? request.getProgress() : 0
            );
            return ResponseEntity.ok(new ProjectResponse("Personal project created successfully", project));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error creating project: " + e.getMessage(), null));
        }
    }

    @PostMapping("/global")
    public ResponseEntity<ProjectResponse> createGlobalProject(
            @RequestBody @Valid CreateProjectRequest request,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            Projects project = projectService.createGlobalProject(
                    request.getName(),
                    request.getDescription(),
                    user,
                    request.getStatus() != null ? request.getStatus() : Projects.ProjectStatus.PLANNING,
                    request.getPriority() != null ? request.getPriority() : Projects.ProjectPriority.MEDIUM,
                    request.getStartDate(),
                    request.getEndDate(),
                    request.getAssignedUserId()
            );
            return ResponseEntity.ok(new ProjectResponse("Global project created successfully", project));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error creating project: " + e.getMessage(), null));
        }
    }

    @PostMapping("/global/{projectId}/assign/{userId}")
    public ResponseEntity<ProjectResponse> assignGlobalProject(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            Authentication authentication) {
        try {
            Users admin = userService.getCurrentUser(authentication);
            Projects project = projectService.assignGlobalProject(projectId, userId, admin);
            return ResponseEntity.ok(new ProjectResponse("Project assigned successfully", project));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error assigning project: " + e.getMessage(), null));
        }
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID projectId,
            @RequestBody UpdateProjectRequest request,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            Projects updatedProject = new Projects();
            updatedProject.setName(request.getName());
            updatedProject.setDescription(request.getDescription());
            updatedProject.setStatus(request.getStatus());
            updatedProject.setPriority(request.getPriority());

            if (request.getStartDate() != null) {
                try {
                    LocalDate startDate = parseDate(request.getStartDate());
                    updatedProject.setStartDate(startDate);
                } catch (Exception e) {
                    log.error("Failed to parse start date: " + request.getStartDate(), e);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ProjectResponse("Invalid start date format. Use YYYY-MM-DD", null));
                }
            }

            if (request.getEndDate() != null) {
                try {
                    LocalDate endDate = parseDate(request.getEndDate());
                    updatedProject.setEndDate(endDate);
                } catch (Exception e) {
                    log.error("Failed to parse end date: " + request.getEndDate(), e);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ProjectResponse("Invalid end date format. Use YYYY-MM-DD", null));
                }
            }

            Projects project = projectService.updateProject(projectId, updatedProject, user);
            return ResponseEntity.ok(new ProjectResponse("Project updated successfully", project));
        } catch (Exception e) {
            log.error("Error updating project: " + e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error updating project: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> deleteProject(
            @PathVariable UUID projectId,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            projectService.deleteProject(projectId, user);
            return ResponseEntity.ok(new ProjectResponse("Project deleted successfully", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error deleting project: " + e.getMessage(), null));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<ProjectStats> getProjectStats(Authentication authentication) {
        try {
            if (authentication == null) {
                log.error("Authentication is null!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Users user = userService.getCurrentUser(authentication);
            ProjectStats stats = projectService.getUserProjectStats(user);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting project stats", e);
            log.error("Exception type: {}", e.getClass().getName());
            log.error("Exception message: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectsResponse> getProject(
            @PathVariable UUID projectId,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            Optional<ProjectsResponse> projectOpt = projectService.findProjectById(projectId, user);

            return projectOpt.map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{projectId}/progress")
    public ResponseEntity<ProjectResponse> updateProjectProgress(
            @PathVariable UUID projectId,
            @RequestBody UpdateProgressRequest request,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);
            Projects project = projectService.updateProjectProgress(projectId, request.getProgress(), user);
            return ResponseEntity.ok(new ProjectResponse("Project progress updated successfully", project));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error updating project progress: " + e.getMessage(), null));
        }
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            if (request.getName() == null || request.getName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ProjectResponse("Project name is required", null));
            }

            Projects project;

            if (user.isAdmin() && "global".equals(request.getProjectType())) {
                log.info("Creating global project for admin: {}, assigned to user: {}",
                        user.getUsername(), request.getAssignedUserId());

                project = projectService.createGlobalProject(
                        request.getName(),
                        request.getDescription(),
                        user,
                        request.getStatus() != null ? request.getStatus() : Projects.ProjectStatus.PLANNING,
                        request.getPriority() != null ? request.getPriority() : Projects.ProjectPriority.MEDIUM,
                        request.getStartDate(),
                        request.getEndDate(),
                        request.getAssignedUserId()
                );

                return ResponseEntity.ok(new ProjectResponse("Global project created successfully", project));
            } else {
                log.info("Creating personal project for user: {}", user.getUsername());
                project = projectService.createPersonalProject(
                        request.getName(),
                        request.getDescription(),
                        user,
                        request.getStatus() != null ? request.getStatus() : Projects.ProjectStatus.PLANNING,
                        request.getPriority() != null ? request.getPriority() : Projects.ProjectPriority.MEDIUM,
                        request.getStartDate(),
                        request.getEndDate(),
                        request.getProgress() != null ? request.getProgress() : 0
                );

                return ResponseEntity.ok(new ProjectResponse("Personal project created successfully", project));
            }

        } catch (Exception e) {
            log.error("Error creating project: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ProjectResponse("Error creating project: " + e.getMessage(), null));
        }
    }

    @GetMapping("/assigned/count")
    public ResponseEntity<Long> getAssignedProjectsCount(Authentication authentication) {
        try {
            if (authentication == null) {
                log.error("Authentication is null!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Users user = userService.getCurrentUser(authentication);

            long count = projectService.getAssignedProjectsCount(user);
            log.info("Assigned projects count retrieved successfully: {}", count);

            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Error getting assigned projects count", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/sync-github")
    public ResponseEntity<?> syncGitHubProjects(Authentication authentication) {
        try {
            Users user = userService.getCurrentUser(authentication);

            gitHubService.autoSyncGitHubProjects(user);

            String rate = gitHubService.getRateLimitInfo();

            return ResponseEntity.ok(Map.of(
                    "message", "GitHub projects synced successfully",
                    "timestamp", LocalDateTime.now()
            ));

        } catch (Exception e) {
            log.error("Error syncing GitHub projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to sync GitHub projects: " + e.getMessage()));
        }
    }

    private LocalDate parseDate(String dateString) {
        if (dateString == null || dateString.trim().isEmpty()) {
            return null;
        }

        try {
            return LocalDate.parse(dateString);
        } catch (Exception e1) {
            try {
                return LocalDateTime.parse(dateString).toLocalDate();
            } catch (Exception e2) {
                throw new RuntimeException("Invalid date format: " + dateString + ". Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS");
            }
        }
    }

}
