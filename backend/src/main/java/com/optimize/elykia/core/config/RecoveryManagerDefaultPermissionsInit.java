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
 * Flyway est désactivé en local : aligne les comptes chef de recouvrement existants
 * sur le défaut métier (clients + changement de commercial).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecoveryManagerDefaultPermissionsInit implements ApplicationListener<ApplicationReadyEvent> {

    private static final String RECOVERY_MANAGER_PROFILE = "RECOVERY_MANAGER";
    private static final List<String> DEFAULT_PERMISSIONS = List.of(
            UserPermissionConstant.CONSULT_CLIENT,
            UserPermissionConstant.EDIT_CLIENT,
            UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR,
            UserPermissionConstant.ASSIGN_CREDIT_COLLECTOR,
            UserPermissionConstant.TONTINE_CARNET_VERIFY
    );

    private final UserService userService;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        try {
            transactionTemplate.executeWithoutResult(status -> grantMissingPermissions());
        } catch (Exception exception) {
            log.warn("Impossible d'aligner les permissions chef de recouvrement: {}", exception.getMessage());
        }
    }

    private void grantMissingPermissions() {
        List<User> recoveryManagers = userService.getByUserProfil(RECOVERY_MANAGER_PROFILE);
        for (User user : recoveryManagers) {
            Set<String> owned = user.getPermissions() == null
                    ? Set.of()
                    : user.getPermissions().stream().map(UserPermission::getName).collect(Collectors.toSet());
            for (String permission : DEFAULT_PERMISSIONS) {
                if (owned.contains(permission)) {
                    continue;
                }
                userService.addPermission(user.getId(), permission);
                log.info("Chef de recouvrement {} : permission {} ajoutée", user.getUsername(), permission);
            }
        }
    }
}
