package service;

import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import repository.ProjectRepository;
import tables.Projects;
import tables.Users;

import java.io.IOException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class GitHubService {

    private static final Logger log = LoggerFactory.getLogger(GitHubService.class);

    @Autowired
    private ProjectRepository projectRepository;

    @Value("${github.api.token:}")
    private String githubToken;

    @Transactional
    public void autoSyncGitHubProjects(Users user) {
        try {
            log.info("Auto-syncing GitHub projects for user: {}", user.getUsername());

            // Connect to GitHub API using token
            GitHub github = connectToGitHub();

            // Check if we're authenticated
            if (!github.isAnonymous()) {
                log.info("Successfully authenticated with GitHub API");
            } else {
                log.warn("Using anonymous GitHub API access (rate limits apply)");
            }
            if (user.getUsernameGHUB() == null || user.getUsernameGHUB().isEmpty()) {
                log.error("GitHub username {} not found for user: {}", user.getUsernameGHUB(), user.getUsername());
                return;
            }

            // Try to get user's repositories
            List<GHRepository> repositories = getUserRepositories(github, user.getUsernameGHUB());

            if (repositories.isEmpty()) {
                log.info("No GitHub repositories found for user: {}", user.getUsernameGHUB());
                return;
            }

            int importedCount = 0;
            int skippedCount = 0;

            // Import each repository
            for (GHRepository repo : repositories) {
                try {
                    // Skip if already imported
                    if (projectRepository.existsByGithubUrl(repo.getHtmlUrl().toString())) {
                        log.debug("Repository already imported: {}", repo.getName());
                        skippedCount++;
                        continue;
                    }

                    // Create new project from GitHub repo
                    Projects project = createProjectFromRepo(repo, user);
                    projectRepository.save(project);

                    importedCount++;
                    log.debug("Imported repository: {}", repo.getName());

                } catch (Exception e) {
                    log.error("Error importing repository {}: {}", repo.getName(), e.getMessage());
                }
            }

            log.info("GitHub sync completed for user {}: {} imported, {} skipped",
                    user.getUsername(), importedCount, skippedCount);

        } catch (IOException e) {
            log.error("Error connecting to GitHub API for user {}: {}", user.getUsernameGHUB(), e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during GitHub sync for user {}", user.getUsernameGHUB(), e);
        }
    }

    private GitHub connectToGitHub() throws IOException {
        if (githubToken != null && !githubToken.isEmpty()) {
            log.debug("Connecting to GitHub with authentication token");
            return new GitHubBuilder().withOAuthToken(githubToken).build();
        } else {
            log.warn("No valid GitHub token configured, using anonymous access (limited to 60 requests/hour)");
            return GitHub.connectAnonymously();
        }
    }

    private List<GHRepository> getUserRepositories(GitHub github, String username) throws IOException {
        List<GHRepository> repositories = new ArrayList<>();

        try {
            var user = github.getUser(username);
            if (user != null) {
                log.info("Found GitHub user: {}", username);

                // Get all public repositories owned by the user
                var repos = user.listRepositories();
                for (GHRepository repo : repos) {
                    // Only include repositories owned by the user (not forks unless they want them)
                    if (!repo.isFork()) {
                        repositories.add(repo);
                        log.debug("Found repository: {}", repo.getName());
                    }
                }

                log.info("Found {} repositories for user {}", repositories.size(), username);
            }
        } catch (IOException e) {
            log.warn("GitHub user not found or error fetching repos: {} - {}", username, e.getMessage());
        }

        return repositories;
    }

    private Projects createProjectFromRepo(GHRepository repo, Users user) throws IOException {
        Projects project = new Projects();

        // Basic info
        project.setName(repo.getName());
        project.setDescription(repo.getDescription());
        project.setCreatedBy(user);
        project.setIsGlobal(false); // GitHub imports are personal projects

        // GitHub specific
        project.setGithubUrl(repo.getHtmlUrl().toString());
        project.setIsGithubImport(true);

        // Set default status based on repo activity
        Date pushedAt = repo.getPushedAt();
        if (pushedAt != null) {
            project.setStatus(Projects.ProjectStatus.IN_PROGRESS);
        } else {
            project.setStatus(Projects.ProjectStatus.PLANNING);
        }

        // Set priority based on stars/activity
        int stars = repo.getStargazersCount();
        if (stars > 10) {
            project.setPriority(Projects.ProjectPriority.HIGH);
        } else if (stars > 5) {
            project.setPriority(Projects.ProjectPriority.MEDIUM);
        } else {
            project.setPriority(Projects.ProjectPriority.LOW);
        }

        // Set dates
        Date createdAt = repo.getCreatedAt();
        if (createdAt != null) {
            project.setStartDate(createdAt.toInstant().atZone(ZoneId.systemDefault()).toLocalDate());
        }

        Date updatedAt = repo.getUpdatedAt();
        if (updatedAt != null) {
            project.setEndDate(updatedAt.toInstant().atZone(ZoneId.systemDefault()).toLocalDate());
        }

        // Set progress based on open issues
        project.setProgress(0);

        return project;
    }

    @Transactional
    public int manualSyncGitHubProjects(Users user) {
        autoSyncGitHubProjects(user);
        return projectRepository.findByCreatedByAndIsGithubImportTrue(user).size();
    }

    public String getRateLimitInfo() {
        try {
            GitHub github = connectToGitHub();
            var rateLimit = github.getRateLimit();
            return String.format("Rate Limit - Remaining: %d/%d, Resets at: %s",
                    rateLimit.getRemaining(),
                    rateLimit.getLimit(),
                    rateLimit.getResetDate());
        } catch (IOException e) {
            return "Unable to fetch rate limit info: " + e.getMessage();
        }
    }
}
