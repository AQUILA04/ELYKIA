package com.optimize.common.securities.security.jwt;

import com.optimize.common.securities.exception.DeviceNotAuthorizedException;
import com.optimize.common.securities.service.UserAuthorizedDeviceService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class DeviceAuthorizationFilter extends OncePerRequestFilter {

    public static final String DEVICE_ID_HEADER = "X-Device-Id";

    private final UserAuthorizedDeviceService userAuthorizedDeviceService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/auth/")
                || path.startsWith("/actuator/")
                || path.startsWith("/api/customer/auth/")
                || path.startsWith("/api/v1/customer/app/release/")
                || path.startsWith("/api/v1/mobile/app/release/")
                || path.startsWith("/api/licences/")
                || path.startsWith("/swagger")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/apidoc")
                || path.equals("/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            userAuthorizedDeviceService.validateDeviceForAuthenticatedUser(
                    userDetails.getUsername(),
                    request.getHeader(DEVICE_ID_HEADER));
        } catch (DeviceNotAuthorizedException ex) {
            writeForbidden(response, ex.getMessage());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeForbidden(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        String body = String.format("{\"code\":\"%s\",\"message\":\"%s\"}",
                DeviceNotAuthorizedException.ERROR_CODE,
                escapeJson(message));
        response.getWriter().write(body);
    }

    private String escapeJson(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
