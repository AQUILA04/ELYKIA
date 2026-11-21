package com.optimize.elykia.core.service.sale;

import com.optimize.common.securities.security.services.UserDetailsImpl;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Set;

/**
 * Accès en lecture au rapport de recouvrement terrain.
 *
 * <p>Les autorités Spring sont les permissions de l'utilisateur, pas son profil : il n'existe
 * pas de {@code ROLE_GESTIONNAIRE}. Le gestionnaire est donc reconnu par son profil.</p>
 *
 * <ul>
 *   <li>Superviseurs : permission {@code ROLE_ADMIN} (profils ADMIN et SUPER_ADMIN) ou profil
 *       GESTIONNAIRE, ADMIN, SUPER_ADMIN. Ils consultent le chef de leur choix.</li>
 *   <li>Chef de recouvrement ({@code ROLE_RECOVERY_MANAGER}) : uniquement son propre rapport,
 *       le nom demandé est ignoré.</li>
 * </ul>
 */
@Component("recoveryReportAccess")
public class RecoveryReportAccess {

    static final String ROLE_ADMIN = "ROLE_ADMIN";
    static final String ROLE_RECOVERY_MANAGER = "ROLE_RECOVERY_MANAGER";
    private static final Set<String> SUPERVISOR_PROFILES = Set.of(
            UserProfilConstant.GESTIONNAIRE, UserProfilConstant.ADMIN, UserProfilConstant.SU);

    /** Utilisé par {@code @PreAuthorize("@recoveryReportAccess.canRead()")}. */
    public boolean canRead() {
        Authentication authentication = currentAuthentication();
        return authentication != null
                && (isSupervisor(authentication) || hasAuthority(authentication, ROLE_RECOVERY_MANAGER));
    }

    /**
     * Chef dont le rapport est lu. Un superviseur obtient le chef demandé (à défaut, lui-même) ;
     * tout autre utilisateur est ramené à son propre nom.
     */
    public String resolveRecoveryManager(String requestedUsername) {
        Authentication authentication = currentAuthentication();
        String self = authentication != null ? authentication.getName() : null;
        if (authentication != null && isSupervisor(authentication) && StringUtils.hasText(requestedUsername)) {
            return requestedUsername.trim();
        }
        return self != null ? self.trim() : null;
    }

    private static Authentication currentAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated() ? authentication : null;
    }

    private static boolean isSupervisor(Authentication authentication) {
        if (hasAuthority(authentication, ROLE_ADMIN)) {
            return true;
        }
        return authentication.getPrincipal() instanceof UserDetailsImpl details
                && details.getProfil() != null
                && SUPERVISOR_PROFILES.contains(details.getProfil());
    }

    private static boolean hasAuthority(Authentication authentication, String authority) {
        for (GrantedAuthority granted : authentication.getAuthorities()) {
            if (authority.equals(granted.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
