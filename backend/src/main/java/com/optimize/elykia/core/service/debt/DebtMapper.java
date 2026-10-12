package com.optimize.elykia.core.service.debt;

import com.optimize.elykia.core.dto.debt.*;
import com.optimize.elykia.core.entity.debt.DebtAllocation;
import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.entity.debt.DebtLine;
import com.optimize.elykia.core.entity.debt.DebtSettlement;

import java.util.Comparator;
import java.util.List;

final class DebtMapper {

    private DebtMapper() {
    }

    static DebtDocumentDto toDto(DebtDocument document) {
        return toDto(document, List.of());
    }

    static DebtDocumentDto toDto(DebtDocument document, List<DebtSettlement> settlements) {
        return DebtDocumentDto.builder()
                .id(document.getId())
                .reference(document.getReference())
                .holderUsername(document.getHolderUsername())
                .holderProfile(document.getHolderProfile())
                .debtType(document.getDebtType())
                .periodGrain(document.getPeriodGrain())
                .periodYear(document.getPeriodYear())
                .periodMonth(document.getPeriodMonth())
                .periodDay(document.getPeriodDay())
                .status(document.getStatus())
                .grossAmount(document.getGrossAmount())
                .offsetAmount(document.getOffsetAmount())
                .paidAmount(document.getPaidAmount())
                .remainingAmount(document.getRemainingAmount())
                .monthlyStockId(document.getMonthlyStock() != null ? document.getMonthlyStock().getId() : null)
                .dailyReportId(document.getDailyReport() != null ? document.getDailyReport().getId() : null)
                .inventoryId(document.getInventory() != null ? document.getInventory().getId() : null)
                .createdBy(document.getCreatedBy())
                .dateReg(document.getCreatedDate())
                .cancelledBy(document.getCancelledBy())
                .cancelledAt(document.getCancelledAt())
                .cancelReason(document.getCancelReason())
                .lines(document.getLines() == null ? List.of() : document.getLines().stream()
                        .sorted(Comparator.comparing(l -> l.getSortOrder() != null ? l.getSortOrder() : 0))
                        .map(DebtMapper::toLineDto)
                        .toList())
                .settlements(settlements.stream().map(DebtMapper::toSettlementDto).toList())
                .build();
    }

    static DebtLineDto toLineDto(DebtLine line) {
        String articleName = null;
        Long articleId = null;
        if (line.getArticle() != null) {
            articleId = line.getArticle().getId();
            String commercial = line.getArticle().getCommercialName();
            String name = line.getArticle().getName();
            articleName = ((commercial != null ? commercial + " " : "") + (name != null ? name : "")).trim();
        }
        return DebtLineDto.builder()
                .id(line.getId())
                .articleId(articleId)
                .articleName(articleName)
                .stockItemId(line.getStockItem() != null ? line.getStockItem().getId() : null)
                .inventoryItemId(line.getInventoryItem() != null ? line.getInventoryItem().getId() : null)
                .lineCode(line.getLineCode())
                .label(line.getLabel())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .amount(line.getAmount())
                .priceBasis(line.getPriceBasis())
                .sortOrder(line.getSortOrder())
                .build();
    }

    static DebtSettlementDto toSettlementDto(DebtSettlement settlement) {
        return DebtSettlementDto.builder()
                .id(settlement.getId())
                .reference(settlement.getReference())
                .settlementMode(settlement.getSettlementMode())
                .amount(settlement.getAmount())
                .surplusDebtId(settlement.getSurplusDebt() != null ? settlement.getSurplusDebt().getId() : null)
                .note(settlement.getNote())
                .performedBy(settlement.getPerformedBy())
                .performedAt(settlement.getPerformedAt())
                .allocations(settlement.getAllocations() == null ? List.of() : settlement.getAllocations().stream()
                        .map(DebtMapper::toAllocationDto)
                        .toList())
                .build();
    }

    static DebtAllocationDto toAllocationDto(DebtAllocation allocation) {
        return DebtAllocationDto.builder()
                .debtDocumentId(allocation.getDebtDocument().getId())
                .debtReference(allocation.getDebtDocument().getReference())
                .amount(allocation.getAmount())
                .build();
    }
}
