
package config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authz -> authz
                // Allow access to web pages (UI) - these don't need JWT
                .requestMatchers("/ConsoleApp/**").permitAll()

                // Allow access to static resources
                .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**", "/favicon.ico","/static/**").permitAll()

                // Allow access to public API endpoints
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout", "/api/auth/logout-all", "/api/auth/dashboard","/api/auth/verify").permitAll()

                // Allow access to Swagger/OpenAPI documentation
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                //.requestMatchers("/api/auth/verify").authenticated()

                    // Admin endpoints - require authentication
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Protect all other API endpoints
                .requestMatchers("/api/**").authenticated()

                // All other requests are permitted (for web pages)
                .anyRequest().permitAll()  // Changed from .authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    // Only redirect to login for API requests, not web pages
                    String requestURI = request.getRequestURI();
                    if (requestURI.startsWith("/api/")) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
                    } else {
                        // For web pages, let them load (they'll handle auth in JavaScript)
                        response.sendRedirect("/ConsoleApp/login");
                    }
                })
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:*",
            "https://localhost:*"
        ));
        
        // Allow specific methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));
        
        // Allow specific headers
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Type", 
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "X-CSRF-TOKEN"
        ));
        
        // Expose headers that the client can access
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "X-Total-Count"
        ));
        
        // Allow credentials (cookies, authorization headers)
        configuration.setAllowCredentials(true);
        
        // How long the browser can cache preflight requests (1 hour)
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
