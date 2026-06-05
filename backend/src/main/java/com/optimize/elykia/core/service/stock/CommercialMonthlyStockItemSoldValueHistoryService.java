package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.CommercialMonthlyStockItemSoldValueHistoryDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItemSoldValueHistory;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemSoldValueHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CommercialMonthlyStockItemSoldValueHistoryService {

    private final CommercialMonthlyStockItemSoldValueHistoryRepository repository;

    public CommercialMonthlyStockItemSoldValueHistoryService(
            CommercialMonthlyStockItemSoldValueHistoryRepository repository) {
        this.repository = repository;
    }

    public void record(
            CommercialMonthlyStockItem stockItem,
            Long creditId,
            String creditReference,
            CommercialStockMovementType movementType,
            int quantity,
            double saleUnitPrice,
            double weightedAverageUnitPrice,
            double previousTotalSoldValue,
            double newTotalSoldValue) {
        repository.save(new CommercialMonthlyStockItemSoldValueHistory(
                stockItem,
                creditId,
                creditReference,
                movementType,
                quantity,
                saleUnitPrice,
                weightedAverageUnitPrice,
                previousTotalSoldValue,
                newTotalSoldValue));
    }

    @Transactional(readOnly = true)
    public List<CommercialMonthlyStockItemSoldValueHistoryDto> getByStockItemId(Long stockItemId) {
        return repository.findByStockItem_IdOrderByCreatedDateDesc(stockItemId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private CommercialMonthlyStockItemSoldValueHistoryDto toDto(CommercialMonthlyStockItemSoldValueHistory history) {
        return CommercialMonthlyStockItemSoldValueHistoryDto.builder()
                .id(history.getId())
                .stockItemId(history.getStockItem().getId())
                .creditId(history.getCreditId())
                .creditReference(history.getCreditReference())
                .movementType(history.getMovementType())
                .quantity(history.getQuantity())
                .saleUnitPrice(history.getSaleUnitPrice())
                .weightedAverageUnitPrice(history.getWeightedAverageUnitPrice())
                .previousTotalSoldValue(history.getPreviousTotalSoldValue())
                .newTotalSoldValue(history.getNewTotalSoldValue())
                .deltaValue(history.getDeltaValue())
                .createdDate(history.getCreatedDate())
                .createdBy(history.getCreatedBy())
                .build();
    }
}
