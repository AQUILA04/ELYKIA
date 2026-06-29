package com.optimize.elykia.core.service.stock;

import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockValuationFacadeTest {

    @Mock
    private ParameterService parameterService;

    @Mock
    private FifoStockValuationService fifoStockValuationService;

    @Mock
    private LegacyStockValuationAdapter legacyStockValuationAdapter;

    @Mock
    private ArticleStockLotRepository lotRepository;

    @InjectMocks
    private StockValuationFacade stockValuationFacade;

    @Test
    void usesLegacyAdapterWhenFlagDisabled() {
        Articles article = new Articles(1L);
        article.setPurchasePrice(200);
        article.setStockQuantity(10);

        when(parameterService.isEnabled(StockValuationFacade.FIFO_FLAG_KEY)).thenReturn(false);
        when(legacyStockValuationAdapter.consume(any(), anyInt(), any(), any(), any()))
                .thenReturn(FifoConsumptionResult.builder()
                        .totalCost(1000)
                        .averageUnitCost(200)
                        .quantityConsumed(5)
                        .build());

        FifoConsumptionResult result = stockValuationFacade.consume(
                article,
                5,
                ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                "STOCK_REQUEST",
                1L);

        assertEquals(200, result.getAverageUnitCost());
        verify(fifoStockValuationService, never()).consume(any(), anyInt(), any(), any(), any());
    }

    @Test
    void usesFifoServiceWhenFlagEnabled() {
        Articles article = new Articles(1L);
        when(parameterService.isEnabled(StockValuationFacade.FIFO_FLAG_KEY)).thenReturn(true);
        when(fifoStockValuationService.consume(any(), anyInt(), any(), any(), any()))
                .thenReturn(FifoConsumptionResult.builder()
                        .totalCost(2160)
                        .averageUnitCost(216)
                        .quantityConsumed(10)
                        .build());

        FifoConsumptionResult result = stockValuationFacade.consume(
                article,
                10,
                ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                "STOCK_REQUEST",
                2L);

        assertEquals(216, result.getAverageUnitCost());
        verify(legacyStockValuationAdapter, never()).consume(any(), anyInt(), any(), any(), any());
    }

    @Test
    void registerEntryDelegatesToFifoWhenEnabled() {
        Articles article = new Articles(1L);
        when(parameterService.isEnabled(StockValuationFacade.FIFO_FLAG_KEY)).thenReturn(true);

        stockValuationFacade.registerEntry(
                article, 5, 200, ArticleStockLotSourceType.STOCK_RECEPTION, null, null);

        verify(fifoStockValuationService).registerEntry(
                article, 5, 200, ArticleStockLotSourceType.STOCK_RECEPTION, null, null);
    }
}
