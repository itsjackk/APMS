package controller;

import jakarta.servlet.http.Cookie;
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
import repository.RefreshTokensRepository;
import repository.UserRepository;
import service.JwtService;
import tables.RefreshTokens;

import java.util.Optional;
import java.util.UUID;

@Controller
@RequestMapping("/ConsoleApp")
public class WebController {

    private static final Logger log = LoggerFactory.getLogger(WebController.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RefreshTokensRepository refreshTokensRepository;

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
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null) {
                log.warn("No refresh token found in cookies");
                return "redirect:/ConsoleApp/login";
            }
            if (!jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid refresh token");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not found or invalid in database");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            log.info("User '{}' with role '{}' accessing dashboard", username, role);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            if ("ADMIN".equals(role)) {
                long totalUsers = usersRepository.count();
                model.addAttribute("totalUsers", totalUsers);
                log.info("Admin user, adding total users count: {}", totalUsers);
            }
            log.info("Successfully serving dashboard for user '{}'", username);
            return "dashboard";
        } catch (Exception e) {
            log.error("Error loading dashboard", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/projects")
    public String projectsPage(HttpServletRequest request, Model model) {
        log.info("Projects page requested");
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            log.info("User '{}' with role '{}' accessing projects page", username, role);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving projects page for user '{}'", username);
            return "projects";
        } catch (Exception e) {
            log.error("Error processing projects page request", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/projects/create")
    public String createProjectPage(HttpServletRequest request, Model model) {
        log.info("Create project page requested");
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            log.info("User '{}' with role '{}' accessing create project page", username, role);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving create project page for user '{}'", username);
            return "create-project";
        } catch (Exception e) {
            log.error("Error processing create project page request", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/projects/assigned")
    public String assignedProjectsPage(HttpServletRequest request, Model model) {
        log.info("Assigned projects page requested");
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            log.info("User '{}' with role '{}' accessing assigned projects page", username, role);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving assigned projects page for user '{}'", username);
            return "assigned-projects";
        } catch (Exception e) {
            log.error("Error processing assigned projects page request", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/profile")
    public String profilePage(HttpServletRequest request, Model model) {
        log.info("Profile page requested");
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            log.info("User '{}' with role '{}' accessing profile page", username, role);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving profile page for user '{}'", username);
            return "profile";
        } catch (Exception e) {
            log.error("Error processing profile page request", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/projects/edit/{projectId}")
    public String editProjectPage(@PathVariable UUID projectId, HttpServletRequest request, Model model) {
        log.info("Edit project page requested for project ID: {}", projectId);
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            log.info("User '{}' with role '{}' accessing edit project page for project {}", username, role, projectId);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("projectId", projectId);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving edit project page for user '{}' and project {}", username, projectId);
            return "edit-project";
        } catch (Exception e) {
            log.error("Error processing edit project page request for project {}", projectId, e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/admin/projects")
    public String adminProjectsPage(HttpServletRequest request, Model model) {
        log.info("Admin projects management page requested");
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            if (!"ADMIN".equals(role)) {
                log.warn("User '{}' with role '{}' attempted to access admin projects page", username, role);
                return "redirect:/ConsoleApp/dashboard";
            }
            log.info("Admin user '{}' accessing projects management page", username);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving admin projects page for user '{}'", username);
            return "admin-projects";
        } catch (Exception e) {
            log.error("Error processing admin projects page request", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    @GetMapping("/admin/users")
    public String adminUsersPage(HttpServletRequest request, Model model) {
        log.info("Admin users management page requested");
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken == null || !jwtService.isTokenValid(refreshToken)) {
                log.warn("Invalid or missing refresh token, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
            if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
                log.warn("Refresh token not valid in database, redirecting to login");
                return "redirect:/ConsoleApp/login";
            }
            String username = jwtService.extractUsername(refreshToken);
            String role = jwtService.extractRole(refreshToken);
            if (!"ADMIN".equals(role)) {
                log.warn("User '{}' with role '{}' attempted to access admin users page", username, role);
                return "redirect:/ConsoleApp/dashboard";
            }
            log.info("Admin user '{}' accessing users management page", username);
            model.addAttribute("username", username);
            model.addAttribute("role", role);
            model.addAttribute("isAuthenticated", true);
            log.info("Successfully serving admin users page for user '{}'", username);
            return "admin-users";
        } catch (Exception e) {
            log.error("Error processing admin users page request", e);
            return "redirect:/ConsoleApp/login";
        }
    }

    private String extractRefreshTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("refreshToken".equals(cookie.getName())) {
                    log.debug("Found refresh token cookie");
                    return cookie.getValue();
                }
            }
        }
        log.debug("No refresh token cookie found");
        return null;
    }
}