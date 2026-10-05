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
 * Aligne les comptes ADMIN / SUPER_ADMIN existants sur les permissions commandes
 * (sous-menu Services en ligne &gt; Commandes et menu Commandes).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminOrderPermissionsInit implements ApplicationListener<ApplicationReadyEvent> {

    private static final List<String> TARGET_PROFILES = List.of("ADMIN", "SUPER_ADMIN");
    private static final List<String> ORDER_PERMISSIONS = List.of(
            UserPermissionConstant.CONSULT_ORDER,
            UserPermissionConstant.EDIT_ORDER
    );

    private final UserService userService;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        try {
            transactionTemplate.executeWithoutResult(status -> grantMissingPermissions());
        } catch (Exception exception) {
            log.warn("Impossible d'aligner les permissions commandes ADMIN/SUPER_ADMIN: {}", exception.getMessage());
        }
    }

    private void grantMissingPermissions() {
        for (String profile : TARGET_PROFILES) {
            List<User> users = userService.getByUserProfil(profile);
            for (User user : users) {
                Set<String> owned = user.getPermissions() == null
                        ? Set.of()
                        : user.getPermissions().stream().map(UserPermission::getName).collect(Collectors.toSet());
                for (String permission : ORDER_PERMISSIONS) {
                    if (owned.contains(permission)) {
                        continue;
                    }
                    userService.addPermission(user.getId(), permission);
                    log.info("Profil {} — utilisateur {} : permission {} ajoutée",
                            profile, user.getUsername(), permission);
                }
            }
        }
    }
}
