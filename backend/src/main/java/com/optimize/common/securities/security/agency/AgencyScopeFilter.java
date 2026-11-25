package com.optimize.common.securities.security.agency;

import java.io.IOException;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.optimize.common.securities.security.services.UserDetailsImpl;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Applique le cloisonnement multi-agences.
 * Profil_Terrain sans agencyId → HTTP 403.
 * Profil_Global → pas de restriction (filtre optionnel au niveau service).
 */
@Component
@Order(100)
public class AgencyScopeFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AgencyScopeFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        return path.startsWith("/api/auth")
                || path.startsWith("/api/customer")
                || path.startsWith("/api/public")
                || path.startsWith("/api/licences")
                || path.startsWith("/api/parameters")
                || path.startsWith("/actuator")
                || path.startsWith("/swagger")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/v2/api-docs")
                || path.startsWith("/apidoc")
                || path.equals("/")
                || path.startsWith("/i18n")
                || path.startsWith("/content");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            filterChain.doFilter(request, response);
            return;
        }

        String profil = userDetails.getProfil();
        if (AgencyProfils.isGlobal(profil) || !AgencyProfils.isTerrain(profil)) {
            // Global or unknown/other profil: no agency forced scope
            filterChain.doFilter(request, response);
            return;
        }

        Long agencyId = userDetails.getAgencyId();
        if (agencyId == null) {
            log.warn("Denied access: terrain user id={} url={} has no agencyId at {}",
                    userDetails.getId(), request.getRequestURI(), LocalDateTime.now());
            response.sendError(HttpServletResponse.SC_FORBIDDEN,
                    "Aucune agence assignée à ce compte.");
            return;
        }

        AgencyContext.setCurrentAgencyId(agencyId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            AgencyContext.clear();
        }
    }
}
