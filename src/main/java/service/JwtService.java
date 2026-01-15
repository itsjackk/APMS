package service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    // Constants for day-based expiration (in seconds)
    private static final long SECONDS_PER_DAY = 86400L; // 24 * 60 * 60

    public String generateAccessToken(UUID userId, String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("type", "access");
        claims.put("role", role);
        return createToken(claims, username, accessTokenExpiration);
    }

    public String generateAccessToken(UUID userId, String username, String role, int expirationDays) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("type", "access");
        claims.put("role", role);
        claims.put("rememberMe", true); // Mark as remember me token
        long expirationSeconds = expirationDays * SECONDS_PER_DAY;
        return createToken(claims, username, expirationSeconds);
    }

    public String generateRefreshToken(UUID userId, String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("type", "refresh");
        claims.put("role", role);
        return createToken(claims, username, refreshTokenExpiration);
    }

    public String generateRefreshToken(UUID userId, String username, String role, int expirationDays) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("type", "refresh");
        claims.put("role", role);
        claims.put("rememberMe", true); // Mark as remember me token
        long expirationSeconds = expirationDays * SECONDS_PER_DAY;
        return createToken(claims, username, expirationSeconds);
    }

    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration * 1000))
                .signWith(getSignInKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    public UUID extractUserId(String token) {
        String userIdStr = extractClaim(token, claims -> claims.get("userId", String.class));
        return UUID.fromString(userIdStr);
    }

    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("type", String.class));
    }

    public boolean isRememberMeToken(String token) {
        try {
            Boolean rememberMe = extractClaim(token, claims -> claims.get("rememberMe", Boolean.class));
            return rememberMe != null && rememberMe;
        } catch (Exception e) {
            return false;
        }
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenExpired(String token) {
        Date expiration = extractClaim(token, Claims::getExpiration);
        return expiration.before(new Date());
    }

    public boolean isAccessTokenValid(String token, String username) {
        try {
            // First check expiration (also validates signature)
            if (isTokenExpired(token)) {
                return false;
            }

            // Validate username
            String extractedUsername = extractUsername(token);
            if (!extractedUsername.equals(username)) {
                return false;
            }

            // Verify token type
            String tokenType = extractTokenType(token);
            return "access".equals(tokenType);

        } catch (Exception e) {
            return false;
        }
    }

    public boolean isRefreshTokenValid(String token, String username) {
        try {
            // First check expiration (also validates signature)
            if (isTokenExpired(token)) {
                return false;
            }

            // Validate username
            String extractedUsername = extractUsername(token);
            if (!extractedUsername.equals(username)) {
                return false;
            }

            // Verify token type
            String tokenType = extractTokenType(token);
            return "refresh".equals(tokenType);

        } catch (Exception e) {
            return false;
        }
    }

    public LocalDateTime getRefreshTokenExpirationTime() {
        return LocalDateTime.now().plusSeconds(refreshTokenExpiration);
    }

    public LocalDateTime getRefreshTokenExpirationTime(int expirationDays) {
        return LocalDateTime.now().plusDays(expirationDays);
    }

    private SecretKey getSignInKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public boolean isTokenValid(String token) {
        try {
            if (token == null || token.trim().isEmpty()) {
                return false;
            }

            // Check if token is not expired (this also validates signature)
            if (isTokenExpired(token)) {
                return false;
            }

            // Try to extract username to validate signature
            String username = extractUsername(token);
            return username != null && !username.trim().isEmpty();

        } catch (Exception e) {
            return false;
        }
    }
}
