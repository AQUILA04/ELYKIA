package com.optimize.common.securities.security.agency;

/**
 * Thread-local agency scope for the current HTTP request.
 */
public final class AgencyContext {

    private static final ThreadLocal<Long> CURRENT = new ThreadLocal<>();

    private AgencyContext() {
    }

    public static void setCurrentAgencyId(Long agencyId) {
        CURRENT.set(agencyId);
    }

    public static Long getCurrentAgencyId() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
