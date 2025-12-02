
package controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.IOException;

@Controller
public class CustomErrorController implements ErrorController {

    private static final Logger log = LoggerFactory.getLogger(CustomErrorController.class);

    @RequestMapping("/error")
    public void handleError(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        String requestUri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);

        if (status != null) {
            int statusCode = Integer.parseInt(status.toString());
            
            // Check if it's a static resource or browser-specific request (ignore these)
            if (requestUri != null && shouldIgnoreRequest(requestUri)) {
                log.debug("Ignoring request for: {}", requestUri);
                response.setStatus(HttpStatus.NOT_FOUND.value());
                return;
            }
            
            log.warn("Error {} occurred for URI: {}", statusCode, requestUri);

            // Redirect 404 errors to login (except ignored resources)
            if (statusCode == HttpStatus.NOT_FOUND.value()) {
                log.info("404 error for {}, redirecting to login", requestUri);
                response.sendRedirect("/ConsoleApp/login");
                return;
            }
            
            // Log other error codes
            if (statusCode == HttpStatus.FORBIDDEN.value()) {
                log.warn("403 Forbidden error for {}, redirecting to login", requestUri);
            } else if (statusCode == HttpStatus.UNAUTHORIZED.value()) {
                log.warn("401 Unauthorized error for {}, redirecting to login", requestUri);
            } else if (statusCode >= 500) {
                log.error("Server error {} occurred for URI: {}", statusCode, requestUri);
            }
        } else {
            log.warn("Error occurred without status code for URI: {}", requestUri);
        }

        // For other errors, redirect to login
        response.sendRedirect("/ConsoleApp/login");
    }
    
    /**
     * Check if the request should be ignored (static resources or browser-specific requests)
     */
    private boolean shouldIgnoreRequest(String uri) {
        if (uri == null) {
            return false;
        }
        
        // Browser-specific requests that should be ignored
        if (uri.startsWith("/.well-known/") ||
            uri.contains("/devtools") ||
            uri.equals("/favicon.ico")) {
            return true;
        }
        
        // Common static resource patterns
        return uri.endsWith(".css") ||
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
               uri.contains("/static/") ||
               uri.contains("/css/") ||
               uri.contains("/js/") ||
               uri.contains("/images/") ||
               uri.contains("/fonts/");
    }
}
