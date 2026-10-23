package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CommercialTontineYearlySummaryDto {
    int year;
    String commercialUsername;
    double totalTontineCollectionsAmount;
    long totalTontineCollectionsCount;
    double totalTontineDepositedAmount;
    double remainingAtCommercialAmount;
    /** Somme des montants lus sur les carnets au dernier contrôle de la session. */
    double controlledNotebookAmount;
    /** Écarts encore ouverts où le carnet dépasse le système. */
    double pendingNotebookAboveSystemAmount;
}
