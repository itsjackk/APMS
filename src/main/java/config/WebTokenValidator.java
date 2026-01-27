package config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import repository.RefreshTokensRepository;
import service.JwtService;
import tables.RefreshTokens;

import java.util.Optional;

/**
 * Utility component for validating tokens from web requests.
 * Extracts common token validation logic used in web controllers.
 */
@Component
public class WebTokenValidator {

    private static final Logger log = LoggerFactory.getLogger(WebTokenValidator.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RefreshTokensRepository refreshTokensRepository;

    /**
     * Validates refresh token from request cookies and database.
     *
     * @param request HTTP request containing cookies
     * @return true if token is valid, false otherwise
     */
    public boolean isValidRefreshToken(HttpServletRequest request) {
        String refreshToken = extractRefreshTokenFromCookies(request);
        
        if (refreshToken == null) {
            log.debug("No refresh token found in cookies");
            return false;
        }

        if (!jwtService.isTokenValid(refreshToken)) {
            log.debug("Invalid refresh token");
            return false;
        }

        Optional<RefreshTokens> tokenOpt = refreshTokensRepository.findByToken(refreshToken);
        if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
            log.debug("Refresh token not found or invalid in database");
            return false;
        }

        return true;
    }

    /**
     * Extracts refresh token from request cookies.
     *
     * @param request HTTP request
     * @return refresh token string or null if not found
     */
    public String extractRefreshTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (AppConstants.Auth.REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
                    log.debug("Found refresh token cookie");
                    return cookie.getValue();
                }
            }
        }
        log.debug("No refresh token cookie found");
        return null;
    }

    /**
     * Extracts username from refresh token.
     *
     * @param request HTTP request containing cookies
     * @return username or null if token not found or invalid
     */
    public String extractUsernameFromCookies(HttpServletRequest request) {
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken != null) {
                return jwtService.extractUsername(refreshToken);
            }
        } catch (Exception e) {
            log.error("Failed to extract username from token", e);
        }
        return null;
    }

    /**
     * Extracts role from refresh token.
     *
     * @param request HTTP request containing cookies
     * @return role string or null if token not found or invalid
     */
    public String extractRoleFromCookies(HttpServletRequest request) {
        try {
            String refreshToken = extractRefreshTokenFromCookies(request);
            if (refreshToken != null) {
                return jwtService.extractRole(refreshToken);
            }
        } catch (Exception e) {
            log.error("Failed to extract role from token", e);
        }
        return null;
    }
}