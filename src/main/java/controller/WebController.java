package controller;

import config.AppConstants;
import config.WebTokenValidator;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.context.request.RequestContextHolder;
import repository.UserRepository;

import java.util.UUID;

/**
 * Controller for serving web pages (Thymeleaf templates).
 */
@Controller
@RequestMapping("/ConsoleApp")
public class WebController {

    private static final Logger log = LoggerFactory.getLogger(WebController.class);

    @Autowired
    private WebTokenValidator webTokenValidator;

    @Autowired
    private UserRepository usersRepository;

    @GetMapping("/")
    public String index() {
        log.info("Index page requested, redirecting to login");
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String loginPage(Model model) {
        String referer = "";
        try {
            referer = RequestContextHolder.currentRequestAttributes().toString();
        } catch (Exception e) {
            log.error("Failed to extract referer from request context", e);
        }
        log.info("Serving login page (Referer: {})", referer);
        return "login";
    }

    @GetMapping("/register")
    public String registerPage(Model model) {
        log.info("Serving register page");
        return "register";
    }

    @GetMapping("/dashboard")
    public String dashboard(HttpServletRequest request, Model model) {
        return handleAuthenticatedPage(request, model, "dashboard", page -> {
            String role = webTokenValidator.extractRoleFromCookies(request);
            if (AppConstants.Security.ROLE_ADMIN.equals(role)) {
                long totalUsers = usersRepository.count();
                model.addAttribute("totalUsers", totalUsers);
                log.info("Admin user, adding total users count: {}", totalUsers);
            }
        });
    }

    @GetMapping("/projects")
    public String projectsPage(HttpServletRequest request, Model model) {
        log.info("Projects page requested");
        return handleAuthenticatedPage(request, model, "projects", null);
    }

    @GetMapping("/projects/create")
    public String createProjectPage(HttpServletRequest request, Model model) {
        log.info("Create project page requested");
        return handleAuthenticatedPage(request, model, "create-project", null);
    }

    @GetMapping("/projects/assigned")
    public String assignedProjectsPage(HttpServletRequest request, Model model) {
        log.info("Assigned projects page requested");
        return handleAuthenticatedPage(request, model, "assigned-projects", null);
    }

    @GetMapping("/profile")
    public String profilePage(HttpServletRequest request, Model model) {
        log.info("Profile page requested");
        return handleAuthenticatedPage(request, model, "profile", null);
    }

    @GetMapping("/projects/edit/{projectId}")
    public String editProjectPage(@PathVariable UUID projectId, HttpServletRequest request, Model model) {
        log.info("Edit project page requested for project ID: {}", projectId);
        return handleAuthenticatedPage(request, model, "edit-project", page -> {
            model.addAttribute("projectId", projectId);
            log.info("Added projectId to model: {}", projectId);
        });
    }

    @GetMapping("/admin/projects")
    public String adminProjectsPage(HttpServletRequest request, Model model) {
        log.info("Admin projects management page requested");
        return handleAdminPage(request, model, "admin-projects");
    }

    @GetMapping("/admin/users")
    public String adminUsersPage(HttpServletRequest request, Model model) {
        log.info("Admin users management page requested");
        return handleAdminPage(request, model, "admin-users");
    }

    /**
     * Common method to handle authenticated pages with optional custom logic.
     *
     * @param request   HTTP request
     * @param model     Spring MVC model
     * @param viewName  name of the view to return
     * @param customLogic optional custom logic to execute (can be null)
     * @return view name or redirect
     */
    private String handleAuthenticatedPage(HttpServletRequest request, Model model,
                                          String viewName, java.util.function.Consumer<String> customLogic) {
        try {
            if (!webTokenValidator.isValidRefreshToken(request)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:" + AppConstants.Endpoints.CONSOLE_LOGIN;
            }

            String username = webTokenValidator.extractUsernameFromCookies(request);
            String role = webTokenValidator.extractRoleFromCookies(request);

            log.info("User '{}' with role '{}' accessing {} page", username, role, viewName);

            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);

            if (customLogic != null) {
                customLogic.accept(viewName);
            }

            log.info("Successfully serving {} page for user '{}'", viewName, username);
            return viewName;

        } catch (Exception e) {
            log.error("Error processing {} page request", viewName, e);
            return "redirect:" + AppConstants.Endpoints.CONSOLE_LOGIN;
        }
    }

    /**
     * Common method to handle admin-only pages.
     *
     * @param request  HTTP request
     * @param model    Spring MVC model
     * @param viewName name of the view to return
     * @return view name or redirect
     */
    private String handleAdminPage(HttpServletRequest request, Model model, String viewName) {
        try {
            if (!webTokenValidator.isValidRefreshToken(request)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:" + AppConstants.Endpoints.CONSOLE_LOGIN;
            }

            String username = webTokenValidator.extractUsernameFromCookies(request);
            String role = webTokenValidator.extractRoleFromCookies(request);

            if (!AppConstants.Security.ROLE_ADMIN.equals(role)) {
                log.warn("User '{}' with role '{}' attempted to access admin page: {}", username, role, viewName);
                return "redirect:" + AppConstants.Endpoints.CONSOLE_DASHBOARD;
            }

            log.info("Admin user '{}' accessing {} page", username, viewName);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);

            log.info("Successfully serving {} page for admin user '{}'", viewName, username);
            return viewName;

        } catch (Exception e) {
            log.error("Error processing admin page: {}", viewName, e);
            return "redirect:" + AppConstants.Endpoints.CONSOLE_LOGIN;
        }
    }
}