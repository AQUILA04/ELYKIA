package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.stock.TontineStockMovement;

import java.time.LocalDateTime;

public record TontineStockMovementDto(
        Long id,
        Long tontineStockId,
        Long creditId,
        String creditReference,
        Long stockTontineRequestId,
        String stockTontineRequestReference,
        Long stockTontineReturnId,
        Long tontineDeliveryId,
        String tontineDeliveryReference,
        String collector,
        Long articleId,
        String articleName,
        String movementType,
        Integer quantityBefore,
        Integer quantityMoved,
        Integer quantityAfter,
        LocalDateTime operationDate
) {
    public static TontineStockMovementDto fromEntity(TontineStockMovement movement) {
        return new TontineStockMovementDto(
                movement.getId(),
                movement.getTontineStockId(),
                movement.getCreditId(),
                movement.getCreditReference(),
                movement.getStockTontineRequestId(),
                movement.getStockTontineRequestReference(),
                movement.getStockTontineReturnId(),
                movement.getTontineDeliveryId(),
                movement.getTontineDeliveryReference(),
                movement.getCollector(),
                movement.getArticleId(),
                movement.getArticleName(),
                movement.getMovementType().name(),
                movement.getQuantityBefore(),
                movement.getQuantityMoved(),
                movement.getQuantityAfter(),
                movement.getOperationDate()
        );
    }
}
