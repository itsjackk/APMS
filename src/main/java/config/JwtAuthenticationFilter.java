
package config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import service.JwtService;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String requestURI = request.getRequestURI();
        String method = request.getMethod();

        // Skip JWT validation for public endpoints - no logging needed
        if (isPublicEndpoint(requestURI)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only log for API endpoints that should have JWT
        log.debug("=== JWT Filter Processing: {} {} ===", method, requestURI);

        try {
            String jwt = getJwtFromRequest(request);

            if (jwt != null && jwtService.isAccessTokenValid(jwt, jwtService.extractUsername(jwt))) {
                String username = jwtService.extractUsername(jwt);
                log.info("Valid JWT found for user: {}", username);

                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                log.debug("User authorities: {}", userDetails.getAuthorities());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.info("Authentication set in SecurityContext for user: {} with roles: {}",
                        username, userDetails.getAuthorities());
            } else if (jwt != null) {
                log.warn("Invalid JWT token for protected endpoint: {}", requestURI);
            } else {
                log.warn("No JWT token found for protected endpoint: {}", requestURI);
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context for URI: {}", requestURI, ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private boolean isPublicEndpoint(String requestURI) {
        // Static resources
        if (isStaticResource(requestURI)) {
            return true;
        }

        // Public paths
        return requestURI.startsWith("/api/auth/login") ||
                requestURI.startsWith("/swagger-ui/") ||
                //requestURI.startsWith("/api/auth/verify") ||
                requestURI.startsWith("/v3/api-docs/") ||
                requestURI.equals("/swagger-ui.html") ||
                requestURI.startsWith("/ConsoleApp/") ||
                requestURI.equals("/favicon.ico") ||
                requestURI.startsWith("/.well-known/");
    }

    private boolean isStaticResource(String uri) {
        return uri.startsWith("/css/") ||
                uri.startsWith("/js/") ||
                uri.startsWith("/images/") ||
                uri.startsWith("/webjars/") ||
                uri.startsWith("/static/") ||
                uri.endsWith(".css") ||
                uri.endsWith(".js") ||
                uri.endsWith(".ico") ||
                uri.endsWith(".png") ||
                uri.endsWith(".jpg") ||
                uri.endsWith(".jpeg") ||
                uri.endsWith(".gif") ||
                uri.endsWith(".svg") ||
                uri.endsWith(".woff") ||
                uri.endsWith(".woff2") ||
                uri.endsWith(".ttf") ||
                uri.endsWith(".eot") ||
                uri.endsWith(".map") ||
                uri.endsWith(".json");
    }
}
