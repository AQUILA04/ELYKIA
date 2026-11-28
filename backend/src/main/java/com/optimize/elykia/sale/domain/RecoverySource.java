package com.optimize.elykia.sale.domain;

import org.springframework.util.StringUtils;

/**
 * Origine métier d'un recouvrement sur un {@link Credit}.
 * Remplace la distinction historique « mise normale vs mise spéciale » par une traçabilité
 * explicite du canal d'encaissement et de ses règles d'orchestration.
 */
public enum RecoverySource {
    WEB_SINGLE(true, true, true),
    WEB_TFJ_BATCH(true, false, true),
    MOBILE_SYNC(true, false, true),
    RECOVERY_MANAGER(true, true, true),
    MOBILE_MONEY(true, true, true),
    FIELD_CONTROL_ECART(false, false, false),
    INITIAL_SALE(false, false, true);

    private final boolean requiresCollectorOwnershipCheck;
    private final boolean supportsAutoReliquatClosure;
    private final boolean publishesCollectionEventImmediately;

    RecoverySource(
            boolean requiresCollectorOwnershipCheck,
            boolean supportsAutoReliquatClosure,
            boolean publishesCollectionEventImmediately) {
        this.requiresCollectorOwnershipCheck = requiresCollectorOwnershipCheck;
        this.supportsAutoReliquatClosure = supportsAutoReliquatClosure;
        this.publishesCollectionEventImmediately = publishesCollectionEventImmediately;
    }

    public boolean requiresCollectorOwnershipCheck() {
        return requiresCollectorOwnershipCheck;
    }

    public boolean supportsAutoReliquatClosure() {
        return supportsAutoReliquatClosure;
    }

    public boolean publishesCollectionEventImmediately() {
        return publishesCollectionEventImmediately;
    }

    public static RecoverySource fromStringOrDefault(String raw, RecoverySource defaultSource) {
        if (!StringUtils.hasText(raw)) {
            return defaultSource;
        }
        try {
            return RecoverySource.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return defaultSource;
        }
    }
}
