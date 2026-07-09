package com.caygiapha.familytree.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Defense-in-depth CSRF mitigation for cookie-authenticated state-changing requests.
 *
 * <p>SameSite=Lax already blocks most cross-site POSTs from foreign origins. This filter additionally
 * rejects mutating requests whose {@code Origin} (or {@code Referer}) is present and not in the
 * configured allowlist — covering older browsers and same-site subdomain mistakes.
 *
 * <p>Requests without Origin/Referer (same-origin navigations, non-browser clients, curl) are
 * allowed so API tooling and server-to-server calls keep working.
 */
@Component
public class CsrfOriginFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS =
            Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final List<String> allowedOrigins;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CsrfOriginFilter(
            @Value("${app.security.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
                    String allowedOriginsCsv) {
        this.allowedOrigins = List.of(allowedOriginsCsv.split(",")).stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.replaceAll("/$", ""))
                .toList();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (SAFE_METHODS.contains(request.getMethod().toUpperCase(Locale.ROOT))) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!request.getRequestURI().startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");
        if ((origin == null || origin.isBlank()) && (referer == null || referer.isBlank())) {
            // Non-browser / same-origin without Origin header.
            filterChain.doFilter(request, response);
            return;
        }

        String candidate = origin != null && !origin.isBlank() ? origin : originFromReferer(referer);
        if (candidate != null && isAllowed(candidate)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(
                "error",
                Map.of(
                        "code", "NOT_AUTHORIZED",
                        "message", "Cross-origin request rejected."));
        objectMapper.writeValue(response.getOutputStream(), body);
    }

    private boolean isAllowed(String origin) {
        String normalized = origin.replaceAll("/$", "");
        return allowedOrigins.stream().anyMatch(normalized::equalsIgnoreCase);
    }

    private static String originFromReferer(String referer) {
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            StringBuilder sb = new StringBuilder();
            sb.append(uri.getScheme()).append("://").append(uri.getHost());
            if (uri.getPort() > 0) {
                sb.append(':').append(uri.getPort());
            }
            return sb.toString();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
