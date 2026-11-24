package com.optimize.elykia.client.dto;

import com.optimize.elykia.client.api.BulkPortfolioOperationMode;
import com.optimize.elykia.client.api.PortfolioActivityType;

import java.util.List;

/**
 * Commande d'opération de portefeuille en masse (1 000+ clients en une transaction).
 * Permet de cibler soit tout le portefeuille d'un commercial source {@code sourceCommercialUsername},
 * soit une sélection explicite {@code clientIds}, filtrée optionnellement par quartier {@code quarter}.
 */
public record BulkPortfolioOperationDto(
        BulkPortfolioOperationMode mode,
        List<PortfolioActivityType> activityTypes,
        String sourceCommercialUsername,
        String targetCommercialUsername,
        List<Long> clientIds,
        String quarter,
        boolean transferInProgressCredits,
        String reason) {
}
