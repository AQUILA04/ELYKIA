package com.optimize.elykia.inventory.web.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Traçabilité de bout en bout d'un lot magasin (Réception -> Transferts inter-agences -> Stock Commercial -> Liquidation client / Ajustement).
 * Invariant : {@code initialQuantity == totalInWarehouses + totalWithCommercials + totalLiquidatedToClients + totalLostOrAdjusted}.
 */
public record LotLifecycleTraceDto(
        Long lotId,
        String lotCode,
        Long agencyId,
        Long parentLotId,
        Long articleId,
        String articleCode,
        String articleName,
        String sourceType,
        String receptionReference,
        LocalDate entryDate,
        double unitPurchasePrice,
        Double unitSalePrice,
        int initialQuantity,
        int remainingInThisLot,
        int totalInWarehouses,
        int totalWithCommercials,
        int totalLiquidatedToClients,
        int totalLostOrAdjusted,
        boolean conservationInvariantHolds,
        List<ChildTransferLotSlice> childTransferLots,
        List<CommercialAllocationSlice> commercialAllocations,
        List<DirectWarehouseLiquidationSlice> directLiquidations) {

    public record ChildTransferLotSlice(
            Long childLotId,
            String childLotCode,
            Long targetAgencyId,
            int quantityTransferred,
            int remainingInChildWarehouse,
            int withCommercialsFromChild,
            int liquidatedFromChild,
            int lostOrAdjustedFromChild) {
    }

    public record CommercialAllocationSlice(
            Long commercialLayerId,
            String commercialUsername,
            String activityType,
            int quantityAllocated,
            int quantityRemainingWithCommercial,
            double unitPurchaseCost,
            Double effectiveSalePrice,
            LocalDateTime acquiredAt,
            List<FinalLiquidationSlice> liquidations) {
    }

    public record FinalLiquidationSlice(
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

    public record DirectWarehouseLiquidationSlice(
            Long consumptionId,
            String movementType,
            int quantity,
            double unitPurchasePrice,
            String sourceType,
            Long sourceId) {
    }
}
