package com.optimize.elykia.bootstrap.config;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.shared.security.UserPermissionConstant;
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
 * Accorde par défaut les permissions Chef Magasinier et Transfert Inter-Agences aux profils globaux :
 * - {@code ROLE_STOREKEEPER_MANAGER} et {@code ROLE_INTER_AGENCY_STOCK_TRANSFER} :
 *   STOREKEEPER_MANAGER, GESTIONNAIRE, ADMIN, SUPER_ADMIN.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StorekeeperManagerPermissionsInit implements ApplicationListener<ApplicationReadyEvent> {

    private static final List<String> MANAGER_PROFILES = List.of(
            "STOREKEEPER_MANAGER", "GESTIONNAIRE", "ADMIN", "SUPER_ADMIN"
    );

    private static final List<String> BASE_STOREKEEPER_PERMISSIONS = List.of(
            UserPermissionConstant.STOREKEEPER,
            UserPermissionConstant.STOREKEEPER_DASHBOARD,
            UserPermissionConstant.CREATE_INVENTORY,
            UserPermissionConstant.RECONCILE_INVENTORY,
            UserPermissionConstant.FINALIZE_INVENTORY,
            UserPermissionConstant.CANCEL_VALIDATED_STOCK_REQUEST,
            UserPermissionConstant.STOREKEEPER_MANAGER,
            UserPermissionConstant.INTER_AGENCY_STOCK_TRANSFER
    );

    private final UserService userService;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        try {
            transactionTemplate.executeWithoutResult(status -> {
                grant(MANAGER_PROFILES, UserPermissionConstant.STOREKEEPER_MANAGER);
                grant(MANAGER_PROFILES, UserPermissionConstant.INTER_AGENCY_STOCK_TRANSFER);
                for (String perm : BASE_STOREKEEPER_PERMISSIONS) {
                    grant(List.of("STOREKEEPER_MANAGER"), perm);
                }
            });
        } catch (Exception exception) {
            log.warn("Impossible d'accorder les permissions de Chef Magasinier : {}", exception.getMessage());
        }
    }

    private void grant(List<String> profiles, String permission) {
        for (String profile : profiles) {
            for (User user : userService.getByUserProfil(profile)) {
                Set<String> owned = user.getPermissions() == null ? Set.of()
                        : user.getPermissions().stream().map(UserPermission::getName).collect(Collectors.toSet());
                if (!owned.contains(permission)) {
                    userService.addPermission(user.getId(), permission);
                }
            }
        }
    }
}
