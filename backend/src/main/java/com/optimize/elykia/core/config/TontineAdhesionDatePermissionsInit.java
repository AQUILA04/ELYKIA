package com.optimize.elykia.core.config;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Accorde ROLE_EDIT_TONTINE_ADHESION_DATE aux comptes admin et super admin
 * déjà créés. Complète la migration Flyway lorsque l'initialisation locale
 * ne rejoue pas les scripts.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TontineAdhesionDatePermissionsInit implements ApplicationListener<ApplicationReadyEvent> {

    private static final List<String> TARGET_PROFILES = List.of("ADMIN", "SUPER_ADMIN");

    private final UserService userService;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        try {
            transactionTemplate.executeWithoutResult(status -> grantMissingPermissions());
        } catch (Exception exception) {
            log.warn("Impossible d'accorder ROLE_EDIT_TONTINE_ADHESION_DATE: {}", exception.getMessage());
        }
    }

    private void grantMissingPermissions() {
        for (String profile : TARGET_PROFILES) {
            List<User> users = userService.getByUserProfil(profile);
            for (User user : users) {
                Set<String> owned = user.getPermissions() == null
                        ? Set.of()
                        : user.getPermissions().stream().map(UserPermission::getName).collect(Collectors.toSet());
                if (owned.contains(UserPermissionConstant.EDIT_TONTINE_ADHESION_DATE)) {
                    continue;
                }
                userService.addPermission(user.getId(), UserPermissionConstant.EDIT_TONTINE_ADHESION_DATE);
                log.info("Profil {} — utilisateur {} : permission {} ajoutée",
                        profile, user.getUsername(), UserPermissionConstant.EDIT_TONTINE_ADHESION_DATE);
            }
        }
    }
}
