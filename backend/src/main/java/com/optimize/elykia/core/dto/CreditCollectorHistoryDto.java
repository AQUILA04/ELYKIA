package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.sale.CreditCollectorHistory;

import java.time.LocalDateTime;

public record CreditCollectorHistoryDto(
        Long id,
        Long creditId,
        String oldCollector,
        String newCollector,
        Double totalAmount,
        Double totalAmountPaid,
        Double totalAmountRemaining,
        LocalDateTime changeDate) {
    public static CreditCollectorHistoryDto fromEntity(CreditCollectorHistory entity) {
        if (entity == null) {
            return null;
        }
        Long creditId = entity.getCredit() != null ? entity.getCredit().getId() : null;
        return new CreditCollectorHistoryDto(
                entity.getId(),
                creditId,
                entity.getOldCollector(),
                entity.getNewCollector(),
                entity.getTotalAmount(),
                entity.getTotalAmountPaid(),
                entity.getTotalAmountRemaining(),
                entity.getChangeDate());
    }
}
