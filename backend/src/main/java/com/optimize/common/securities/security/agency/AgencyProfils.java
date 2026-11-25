package com.optimize.common.securities.security.agency;

import java.util.Set;

/**
 * Profils concernés par le cloisonnement multi-agences.
 */
public final class AgencyProfils {

    public static final Set<String> TERRAIN = Set.of(
            "PROMOTER",
            "STOREKEEPER",
            "SECRETARY",
            "RECOVERY_MANAGER",
            "CASHIER"
    );

    public static final Set<String> GLOBAL = Set.of(
            "GESTIONNAIRE",
            "ADMIN",
            "SUPER_ADMIN",
            "STOREKEEPER_MANAGER"
    );

    private AgencyProfils() {
    }

    public static boolean isTerrain(String profil) {
        return profil != null && TERRAIN.contains(profil);
    }

    public static boolean isGlobal(String profil) {
        return profil != null && GLOBAL.contains(profil);
    }
}
