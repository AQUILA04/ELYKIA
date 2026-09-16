package com.optimize.elykia.core.util;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.function.Supplier;

/**
 * Pose un SecurityContext temporaire avec le username du gestionnaire
 * pour que les opérations auto (audit, getCurrentUser) portent son identité.
 */
public final class ActingUserSecuritySupport {

    private ActingUserSecuritySupport() {
    }

    public static void runAs(String username, Runnable action) {
        runAs(username, () -> {
            action.run();
            return null;
        });
    }

    public static <T> T runAs(String username, Supplier<T> action) {
        SecurityContext previous = SecurityContextHolder.getContext();
        try {
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(
                    username, "N/A", Collections.emptyList()));
            SecurityContextHolder.setContext(context);
            return action.get();
        } finally {
            SecurityContextHolder.setContext(previous);
        }
    }
}
