package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.CommercialMonthlyStockItemSoldValueHistoryDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItemSoldValueHistory;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemSoldValueHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialMonthlyStockItemSoldValueHistoryServiceTest {

    @Mock
    private CommercialMonthlyStockItemSoldValueHistoryRepository repository;
    @InjectMocks
    private CommercialMonthlyStockItemSoldValueHistoryService service;

    @Test
    void record_persistsCompleteSoldValueSnapshotForCreditSale() {
        // Given
        CommercialMonthlyStockItem stockItem = mock(CommercialMonthlyStockItem.class);
        ArgumentCaptor<CommercialMonthlyStockItemSoldValueHistory> historyCaptor =
                ArgumentCaptor.forClass(CommercialMonthlyStockItemSoldValueHistory.class);

        // When
        service.record(stockItem, 50L, "CR-2026-0050", CommercialStockMovementType.CREDIT_SALE,
                2, 25_000.0, 18_000.0, 100_000.0, 150_000.0);

        // Then
        verify(repository).save(historyCaptor.capture());
        CommercialMonthlyStockItemSoldValueHistory history = historyCaptor.getValue();
        assertSame(stockItem, history.getStockItem());
        assertEquals(50L, history.getCreditId());
        assertEquals("CR-2026-0050", history.getCreditReference());
        assertEquals(CommercialStockMovementType.CREDIT_SALE, history.getMovementType());
        assertEquals(2, history.getQuantity());
        assertEquals(25_000.0, history.getSaleUnitPrice());
        assertEquals(18_000.0, history.getWeightedAverageUnitPrice());
        assertEquals(100_000.0, history.getPreviousTotalSoldValue());
        assertEquals(150_000.0, history.getNewTotalSoldValue());
        assertEquals(50_000.0, history.getDeltaValue());
    }

    @Test
    void getByStockItemId_returnsEmptyListWhenNoHistoryExists() {
        // Given
        when(repository.findByStockItem_IdOrderByCreatedDateDesc(10L)).thenReturn(List.of());

        // When
        List<CommercialMonthlyStockItemSoldValueHistoryDto> result = service.getByStockItemId(10L);

        // Then
        assertEquals(List.of(), result);
        verify(repository).findByStockItem_IdOrderByCreatedDateDesc(10L);
    }
}
