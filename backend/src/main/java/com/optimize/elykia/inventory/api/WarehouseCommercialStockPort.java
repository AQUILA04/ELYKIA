package com.optimize.elykia.inventory.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Port SPI permettant à {@code inventory} d'interroger les demandes commerciales unifiées
 * et la traçabilité des couches commerciales sans dépendance directe sur {@code commercialstock}.
 */
public interface WarehouseCommercialStockPort {

    /**
     * Retourne toutes les lignes de demandes commerciales en attente de couverture ou de livraison
     * ({@code CREATED} ou {@code VALIDATED}) pour le calcul du Bon de Commande Fournisseur.
     */
    List<PendingCommercialRequestLine> findPendingRequestLines(Long agencyId, String activityType);

    /**
     * Retourne les couches commerciales issues d'un lot magasin donné (ainsi que leurs consommations aval)
     * pour la traçabilité de bout en bout d'un lot.
     */
    List<CommercialLayerTraceSlice> findLayerTracesByOriginWarehouseLotId(Long warehouseLotId);

    /**
     * Synchronise les compteurs de réservation / manquant sur une demande commerciale lorsque
     * le réapprovisionnement magasin ré-alloue automatiquement du stock aux réservations en attente.
     */
    void onReservationAutoAllocated(Long requestId, Long articleId, int newReservedQty, int newShortageQty);

    record PendingCommercialRequestLine(
            Long requestId,
            String requestReference,
            Long agencyId,
            String commercialUsername,
            String activityType,
            String status,
            LocalDate requestDate,
            Long articleId,
            int quantityRequested,
            int quantityReserved,
            int quantityDelivered,
            int shortageQuantity,
            double unitSalePrice,
            double unitPurchaseCost) {
    }

    record CommercialLayerTraceSlice(
            Long layerId,
            String commercialUsername,
            String activityType,
            int quantityInitial,
            int quantityRemaining,
            double unitPurchaseCost,
            Double effectiveSalePrice,
            LocalDateTime acquiredAt,
            List<CommercialConsumptionSlice> consumptions) {
    }

    record CommercialConsumptionSlice(
            Long movementId,
            String movementType,
            int quantity,
            double unitPurchaseCost,
            Double unitSalePrice,
            String referenceType,
            Long referenceId,
            String referenceCode,
            LocalDate accountingDate,
            String performedBy) {
    }
}
