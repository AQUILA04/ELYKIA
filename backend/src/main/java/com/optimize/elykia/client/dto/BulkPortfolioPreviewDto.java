package com.optimize.elykia.client.dto;

/** Aperçu avant exécution d'une opération de portefeuille en masse. */
public record BulkPortfolioPreviewDto(
        int impactedClientsCount,
        int impactedAssignmentsCount) {
}
