package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.stock.CommercialStockMovement;

import java.time.LocalDateTime;

public record CommercialStockMovementDto(
        Long id,
        Long stockItemId,
        Long creditId,
        String creditReference,
        Long stockReturnId,
        String collector,
        String articleName,
        String movementType,
        Integer quantityBefore,
        Integer quantityMoved,
        Integer quantityAfter,
        LocalDateTime operationDate
) {
    public static CommercialStockMovementDto fromEntity(CommercialStockMovement m) {
        return new CommercialStockMovementDto(
                m.getId(),
                m.getStockItem().getId(),
                m.getCreditId(),
                m.getCreditReference(),
                m.getStockReturnId(),
                m.getCollector(),
                m.getArticle().getCommercialName(),
                m.getMovementType().name(),
                m.getQuantityBefore(),
                m.getQuantityMoved(),
                m.getQuantityAfter(),
                m.getOperationDate()
        );
    }
}
