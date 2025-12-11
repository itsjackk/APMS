package repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tables.Projects;
import tables.Users;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Projects, UUID> {

    // Find projects created by user (personal projects)
    List<Projects> findByCreatedByAndIsGlobalFalse(Users createdBy);

    // Find global projects assigned to user by UUID
    List<Projects> findByIsGlobalTrueAndAssignedTo(UUID assignedTo);

    // Find all global projects
    List<Projects> findByIsGlobalTrue();

    long countByAssignedTo(UUID userId);

    List<Projects> findByStatus(Projects.ProjectStatus status);

    // Custom query to find all projects accessible to a user
    @Query("SELECT p FROM Projects p WHERE " +
            "(p.isGlobal = false AND p.createdBy = :user) OR " +
            "(p.isGlobal = true AND p.assignedTo = :userId)")
    List<Projects> findAccessibleProjects(@Param("user") Users user, @Param("userId") UUID userId);

    Optional<Projects> findByGithubUrl(String githubUrl);

    boolean existsByGithubUrl(String githubUrl);

    List<Projects> findByCreatedByAndIsGithubImportTrue(Users user);
}
