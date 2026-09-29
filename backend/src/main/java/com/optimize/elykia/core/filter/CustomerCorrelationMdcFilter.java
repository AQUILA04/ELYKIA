package com.optimize.elykia.core.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Place deviceId / sessionId / requestId dans le MDC pour corréler les logs serveur
 * au journal d'activité Espace Client.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class CustomerCorrelationMdcFilter extends OncePerRequestFilter {

    public static final String HEADER_DEVICE_ID = "X-Elykia-Device-Id";
    public static final String HEADER_SESSION_ID = "X-Elykia-Session-Id";
    public static final String HEADER_REQUEST_ID = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            put("deviceId", request.getHeader(HEADER_DEVICE_ID));
            put("sessionId", request.getHeader(HEADER_SESSION_ID));
            put("requestId", request.getHeader(HEADER_REQUEST_ID));
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("deviceId");
            MDC.remove("sessionId");
            MDC.remove("requestId");
        }
    }

    private static void put(String key, String value) {
        if (value != null && !value.isBlank()) {
            MDC.put(key, value.trim());
        }
    }
}
