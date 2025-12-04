
package service;

import dto.AdminProjectStats;
import dto.ProjectResponseGhub;
import dto.ProjectStats;
import dto.ProjectsResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import repository.ProjectRepository;
import repository.UserRepository;
import tables.Projects;
import tables.Users;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ProjectsResponse> getAccessibleProjectsForUser(Users user) {
        List<Projects> projects = projectRepository.findAccessibleProjects(user, user.getId());
        return projects.stream()
                .map(project -> {
                    String createdByName = project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null;
                    String assignedToName = null;
                    if (project.getAssignedTo() != null) {
                        Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                        assignedToName = assignedUser.map(Users::getUsername).orElse(null);
                    }
                    return ProjectsResponse.fromEntity(project, createdByName, assignedToName);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponseGhub> getAccessibleProjectsForUserGhub(Users user) {
        List<Projects> projects = projectRepository.findAccessibleProjects(user, user.getId());
        return projects.stream()
                .map(project -> {
                    String createdByName = project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null;
                    String assignedToName = null;
                    if (project.getAssignedTo() != null) {
                        Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                        assignedToName = assignedUser.map(Users::getUsername).orElse(null);
                    }
                    return ProjectResponseGhub.fromEntity(project, createdByName, assignedToName);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<ProjectsResponse> findProjectById(UUID projectId, Users user) {
        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return Optional.empty();
        }

        Projects project = projectOpt.get();
        boolean isPersonal = !project.getIsGlobal() && project.getCreatedBy().getId().equals(user.getId());
        boolean isAssignedGlobal = project.getIsGlobal() && user.getId().equals(project.getAssignedTo());

        if (isPersonal || isAssignedGlobal || user.isAdmin()) {
            String createdByName = project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null;
            String assignedToName = null;
            if (project.getAssignedTo() != null) {
                Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                assignedToName = assignedUser.map(Users::getUsername).orElse(null);
            }
            return Optional.of(ProjectsResponse.fromEntity(project, createdByName, assignedToName));
        }

        return Optional.empty();
    }

    public Projects createPersonalProject(String name, String description, Users user,
                                          Projects.ProjectStatus status, Projects.ProjectPriority priority,
                                          LocalDate startDate, LocalDate endDate, Integer progress) {
        Projects project = new Projects();
        project.setName(name);
        project.setDescription(description);
        project.setCreatedBy(user);
        project.setIsGlobal(false);
        project.setStatus(status);
        project.setPriority(priority);
        project.setStartDate(startDate);
        project.setEndDate(endDate);
        project.setProgress(progress);
        return projectRepository.save(project);
    }

    public Projects createGlobalProject(String name, String description, Users admin,
                                        Projects.ProjectStatus status, Projects.ProjectPriority priority,
                                        LocalDate startDate, LocalDate endDate, UUID assignedTo) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can create global projects");
        }

        Projects project = new Projects();
        project.setName(name);
        project.setDescription(description);
        project.setCreatedBy(admin);
        project.setIsGlobal(true);
        project.setStatus(status);
        project.setPriority(priority);
        project.setStartDate(startDate);
        project.setEndDate(endDate);
        project.setAssignedTo(assignedTo);
        return projectRepository.save(project);
    }

    public Projects assignGlobalProject(UUID projectId, UUID userId, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can assign global projects");
        }

        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        Optional<Users> userOpt = userRepository.findById(userId);

        if (projectOpt.isEmpty() || userOpt.isEmpty()) {
            throw new RuntimeException("Project or User not found");
        }

        Projects project = projectOpt.get();
        if (!project.getIsGlobal()) {
            throw new RuntimeException("Only global projects can be assigned");
        }

        project.setAssignedTo(userId);
        return projectRepository.save(project);
    }

    public List<Projects> getUserProjects(Users user) {
        return projectRepository.findAccessibleProjects(user, user.getId());
    }

    public List<Projects> getUserPersonalProjects(Users user) {
        return projectRepository.findByCreatedByAndIsGlobalFalse(user);
    }

    public List<Projects> getUserAssignedGlobalProjects(Users user) {
        return projectRepository.findByIsGlobalTrueAndAssignedTo(user.getId());
    }

    public List<Projects> getAllGlobalProjects(Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can view all global projects");
        }
        return projectRepository.findByIsGlobalTrue();
    }

    public Projects updateProject(UUID projectId, Projects updatedProject, Users user) {
        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }

        Projects project = projectOpt.get();

        boolean canUpdate = false;
        if (project.getIsGlobal()) {
            canUpdate = user.isAdmin() ||
                    (project.getAssignedTo() != null && project.getAssignedTo().equals(user.getId()));
        } else {
            canUpdate = project.getCreatedBy().getId().equals(user.getId());
        }

        if (!canUpdate) {
            throw new RuntimeException("You don't have permission to update this project");
        }

        if (updatedProject.getName() != null) {
            project.setName(updatedProject.getName());
        }
        if (updatedProject.getDescription() != null) {
            project.setDescription(updatedProject.getDescription());
        }
        if (updatedProject.getStatus() != null) {
            project.setStatus(updatedProject.getStatus());
        }
        if (updatedProject.getPriority() != null) {
            project.setPriority(updatedProject.getPriority());
        }
        if (updatedProject.getStartDate() != null) {
            project.setStartDate(updatedProject.getStartDate());
        }
        if (updatedProject.getEndDate() != null) {
            project.setEndDate(updatedProject.getEndDate());
        }

        return projectRepository.save(project);
    }

    public void deleteProject(UUID projectId, Users user) {
        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }

        Projects project = projectOpt.get();

        boolean canDelete = false;
        if (project.getIsGlobal()) {
            canDelete = user.isAdmin();
        } else {
            canDelete = project.getCreatedBy().getId().equals(user.getId());
        }

        if (!canDelete) {
            throw new RuntimeException("You don't have permission to delete this project");
        }

        projectRepository.delete(project);
    }

    public ProjectStats getUserProjectStats(Users user) {
        List<Projects> userProjects = getUserProjects(user);
        Long totalProjects = (long) userProjects.size();

        Long planningProjects = userProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.PLANNING)
                .count();
        Long inProgressProjects = userProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.IN_PROGRESS)
                .count();
        Long completedProjects = userProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.COMPLETED)
                .count();
        Long onHoldProjects = userProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.ON_HOLD)
                .count();

        return new ProjectStats(totalProjects, planningProjects, inProgressProjects, completedProjects, onHoldProjects);
    }

    public Projects updateProjectProgress(UUID projectId, Integer progress, Users user) {
        if (progress < 0 || progress > 100) {
            throw new IllegalArgumentException("Progress must be between 0 and 100");
        }

        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }

        Projects project = projectOpt.get();

        if (!canUserAccessProject(project, user)) {
            throw new RuntimeException("You don't have permission to update this project");
        }

        project.setProgress(progress);

        if (progress == 100 && project.getStatus() != Projects.ProjectStatus.COMPLETED) {
            project.setStatus(Projects.ProjectStatus.COMPLETED);
        } else if (progress > 0 && progress < 100 && project.getStatus() == Projects.ProjectStatus.PLANNING) {
            project.setStatus(Projects.ProjectStatus.IN_PROGRESS);
        }

        return projectRepository.save(project);
    }

    private boolean canUserAccessProject(Projects project, Users user) {
        if (project.getIsGlobal()) {
            return user.isAdmin() ||
                    (project.getAssignedTo() != null && project.getAssignedTo().equals(user.getId()));
        } else {
            return project.getCreatedBy().getId().equals(user.getId());
        }
    }

    public long getAssignedProjectsCount(Users user) {
        return projectRepository.countByAssignedTo(user.getId());
    }

    @Transactional(readOnly = true)
    public List<Projects> getAllProjectsForAdmin(Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can view all projects");
        }
        return projectRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<ProjectsResponse> getProjectByIdForAdmin(UUID projectId, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can access any project");
        }

        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        return projectOpt.map(project -> {
            String createdByName = project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null;
            String assignedToName = null;
            if (project.getAssignedTo() != null) {
                Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                assignedToName = assignedUser.map(Users::getUsername).orElse(null);
            }
            return ProjectsResponse.fromEntity(project, createdByName, assignedToName);
        });
    }

    @Transactional
    public Projects updateProjectAsAdmin(UUID projectId, Projects updatedProject, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can update any project");
        }

        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }

        Projects project = projectOpt.get();

        if (updatedProject.getName() != null) {
            project.setName(updatedProject.getName());
        }
        if (updatedProject.getDescription() != null) {
            project.setDescription(updatedProject.getDescription());
        }
        if (updatedProject.getStatus() != null) {
            project.setStatus(updatedProject.getStatus());
        }
        if (updatedProject.getPriority() != null) {
            project.setPriority(updatedProject.getPriority());
        }
        if (updatedProject.getProgress() != null) {
            project.setProgress(updatedProject.getProgress());
        }
        if (updatedProject.getStartDate() != null) {
            project.setStartDate(updatedProject.getStartDate());
        }
        if (updatedProject.getEndDate() != null) {
            project.setEndDate(updatedProject.getEndDate());
        }
        if (updatedProject.getIsGlobal() != null) {
            project.setIsGlobal(updatedProject.getIsGlobal());
        }
        if (updatedProject.getAssignedTo() != null) {
            project.setAssignedTo(updatedProject.getAssignedTo());
        }

        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProjectAsAdmin(UUID projectId, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can delete any project");
        }

        Optional<Projects> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }

        projectRepository.delete(projectOpt.get());
    }

    @Transactional(readOnly = true)
    public AdminProjectStats getAdminProjectStats(Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can view admin statistics");
        }

        List<Projects> allProjects = projectRepository.findAll();
        Long totalProjects = (long) allProjects.size();

        Long planningProjects = allProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.PLANNING)
                .count();
        Long inProgressProjects = allProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.IN_PROGRESS)
                .count();
        Long completedProjects = allProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.COMPLETED)
                .count();
        Long onHoldProjects = allProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.ON_HOLD)
                .count();
        Long cancelledProjects = allProjects.stream()
                .filter(p -> p.getStatus() == Projects.ProjectStatus.CANCELLED)
                .count();

        Long globalProjects = allProjects.stream()
                .filter(Projects::getIsGlobal)
                .count();
        Long personalProjects = totalProjects - globalProjects;

        Double averageProgress = allProjects.stream()
                .filter(p -> p.getProgress() != null)
                .mapToInt(Projects::getProgress)
                .average()
                .orElse(0.0);

        Long totalUsers = userRepository.count();

        return new AdminProjectStats(
                totalProjects,
                planningProjects,
                inProgressProjects,
                completedProjects,
                onHoldProjects,
                cancelledProjects,
                globalProjects,
                personalProjects,
                averageProgress,
                totalUsers
        );
    }

    @Transactional(readOnly = true)
    public List<ProjectsResponse> getProjectsByStatus(Projects.ProjectStatus status, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can filter all projects");
        }

        List<Projects> projects = projectRepository.findByStatus(status);
        return projects.stream()
                .map(project -> {
                    String createdByName = project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null;
                    String assignedToName = null;
                    if (project.getAssignedTo() != null) {
                        Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                        assignedToName = assignedUser.map(Users::getUsername).orElse(null);
                    }
                    return ProjectsResponse.fromEntity(project, createdByName, assignedToName);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectsResponse> getProjectsByUser(UUID userId, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can view user projects");
        }

        Optional<Users> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        Users user = userOpt.get();
        List<Projects> projects = projectRepository.findAccessibleProjects(user, userId);
        return projects.stream()
                .map(project -> {
                    String createdByName = project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null;
                    String assignedToName = null;
                    if (project.getAssignedTo() != null) {
                        Optional<Users> assignedUser = userRepository.findById(project.getAssignedTo());
                        assignedToName = assignedUser.map(Users::getUsername).orElse(null);
                    }
                    return ProjectsResponse.fromEntity(project, createdByName, assignedToName);
                })
                .collect(Collectors.toList());
    }
}