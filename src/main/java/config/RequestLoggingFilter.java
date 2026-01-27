package config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RequestLoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String uri = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();
        
        if (!StaticResourceUtils.isStaticResource(uri)) {
            log.info("{} request to: {} (Referer: {})", method, uri, httpRequest.getHeader("Referer"));
        }
        
        chain.doFilter(request, response);
    }
}