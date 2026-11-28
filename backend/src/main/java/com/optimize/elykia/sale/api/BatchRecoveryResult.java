package com.optimize.elykia.sale.api;

import java.util.List;

/**
 * Résultat d'exécution d'un lot de recouvrements avec isolation transactionnelle par unité.
 */
public record BatchRecoveryResult(
        List<String> successRecoveryIds,
        List<FailedRecoveryItem> failedRecoveries
) {
    public BatchRecoveryResult {
        successRecoveryIds = successRecoveryIds != null ? List.copyOf(successRecoveryIds) : List.of();
        failedRecoveries = failedRecoveries != null ? List.copyOf(failedRecoveries) : List.of();
    }

    public record FailedRecoveryItem(String recoveryId, String errorMessage) {
    }
}
