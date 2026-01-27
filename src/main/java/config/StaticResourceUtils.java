package config;

/**
 * Utility class for checking if a URI is a static resource.
 * This eliminates code duplication across filters.
 */
public final class StaticResourceUtils {

    private StaticResourceUtils() {
        // Utility class - prevent instantiation
    }

    /**
     * Check if the given URI is a static resource that should bypass security filters.
     *
     * @param uri The request URI to check
     * @return true if the URI is a static resource, false otherwise
     */
    public static boolean isStaticResource(String uri) {
        if (uri == null) {
            return false;
        }
        
        // Check path prefixes
        if (uri.startsWith("/css/") ||
            uri.startsWith("/js/") ||
            uri.startsWith("/images/") ||
            uri.startsWith("/webjars/") ||
            uri.startsWith("/static/")) {
            return true;
        }
        
        // Check file extensions
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
               uri.endsWith(".json");
    }
}