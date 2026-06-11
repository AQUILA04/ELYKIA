package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommercialStockTraceabilityService {

    private final CommercialStockMovementRepository movementRepository;
    private final MonthlyReportMarginCalculator marginCalculator;

    public List<Map<String, Object>> buildTimeline(String collector, int year, int month) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        List<CommercialStockMovement> movements = movementRepository.findTimelineByCollector(collector, start, end);
        List<Map<String, Object>> timeline = new ArrayList<>();
        for (CommercialStockMovement movement : movements) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("operationDate", movement.getOperationDate());
            line.put("articleName", movement.getArticle() != null ? movement.getArticle().getCommercialName() : null);
            line.put("movementTypeLabel", movementTypeLabel(movement.getMovementType()));
            line.put("quantityBefore", movement.getQuantityBefore());
            line.put("quantityMoved", movement.getQuantityMoved());
            line.put("quantityAfter", movement.getQuantityAfter());
            line.put("unitPurchasePrice", movement.getUnitPurchasePrice());
            line.put("unitSalePrice", movement.getUnitSalePrice());
            double unitPurchase = Optional.ofNullable(movement.getUnitPurchasePrice()).orElse(0.0);
            double unitSale = Optional.ofNullable(movement.getUnitSalePrice()).orElse(0.0);
            int quantity = Optional.ofNullable(movement.getQuantityMoved()).orElse(0);
            double margin = Optional.ofNullable(movement.getMarginAmount())
                    .orElse(marginCalculator.lineMargin(unitSale, unitPurchase, quantity));
            line.put("marginAmount", margin);
            timeline.add(line);
        }
        return timeline;
    }

    private String movementTypeLabel(CommercialStockMovementType type) {
        if (type == null) {
            return "-";
        }
        return switch (type) {
            case CREDIT_SALE -> "Vente à crédit";
            case CASH_SALE -> "Vente comptant";
            case STOCK_IN -> "Entrée stock";
            case RETURN -> "Retour";
            case ADJUSTMENT -> "Ajustement";
        };
    }
}
