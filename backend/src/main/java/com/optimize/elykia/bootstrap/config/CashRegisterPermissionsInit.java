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
 * Accorde par défaut les permissions de caisse ventes comptant aux comptes déjà créés :
 * - vente en caisse ({@code ROLE_CASH_REGISTER_SALE}) : CASHIER, SECRETARY, GESTIONNAIRE, ADMIN, SUPER_ADMIN ;
 * - gestion ouverture/clôture ({@code ROLE_CASH_REGISTER_MANAGE}) : CASHIER, GESTIONNAIRE, ADMIN, SUPER_ADMIN.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CashRegisterPermissionsInit implements ApplicationListener<ApplicationReadyEvent> {

    private static final List<String> SALE_PROFILES = List.of("CASHIER", "SECRETARY", "GESTIONNAIRE", "ADMIN", "SUPER_ADMIN");
    private static final List<String> MANAGE_PROFILES = List.of("CASHIER", "GESTIONNAIRE", "ADMIN", "SUPER_ADMIN");

    private final UserService userService;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        try {
            transactionTemplate.executeWithoutResult(status -> {
                grant(SALE_PROFILES, UserPermissionConstant.CASH_REGISTER_SALE);
                grant(MANAGE_PROFILES, UserPermissionConstant.CASH_REGISTER_MANAGE);
            });
        } catch (Exception exception) {
            log.warn("Impossible d'accorder les permissions de caisse : {}", exception.getMessage());
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
