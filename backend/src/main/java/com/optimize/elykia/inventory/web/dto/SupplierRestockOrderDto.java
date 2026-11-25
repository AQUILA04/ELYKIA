package com.optimize.elykia.inventory.web.dto;

import java.util.List;

/**
 * Bon de Commande Fournisseur calculé directement à partir des Demandes de Sortie Commerciales Unifiées
 * ({@code CommercialStockRequest}, activités {@code CREDIT} et {@code TONTINE}) non couvertes par le stock magasin.
 */
public record SupplierRestockOrderDto(
        Long agencyId,
        String agencyName,
        String activityFilter,
        String generationDate,
        int totalArticlesToOrder,
        int totalUnitsRequested,
        int totalUnitsToOrder,
        double totalEstimatedCost,
        List<SupplierRestockLineDto> lines) {

    public record SupplierRestockLineDto(
            int index,
            Long articleId,
            String articleCode,
            String articleName,
            int creditRequestedQty,
            int tontineRequestedQty,
            int totalRequestedQty,
            int warehouseOnHandQty,
            int alreadyReservedForRequestsQty,
            int warehouseAvailableQty,
            int quantityToOrder,
            double unitPurchasePrice,
            double estimatedTotalCost,
            List<String> requestReferences,
            List<String> requestingCommercials) {
    }
}
