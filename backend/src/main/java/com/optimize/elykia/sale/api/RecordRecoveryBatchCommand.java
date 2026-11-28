package com.optimize.elykia.sale.api;

import java.util.List;

/**
 * Commande d'enregistrement par lot de recouvrements (Mobile Sync, Web TFJ, ou endpoints legacy).
 */
public record RecordRecoveryBatchCommand(
        String collector,
        String syncConsentCode,
        List<RecordRecoveryCommand> items,
        boolean ignoreMissingOrClosedCredit
) {
    public RecordRecoveryBatchCommand {
        items = items != null ? List.copyOf(items) : List.of();
    }
}
