package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotConsumptionRepository;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FifoStockValuationServiceTest {

    @Mock
    private ArticleStockLotRepository lotRepository;

    @Mock
    private ArticleStockLotConsumptionRepository consumptionRepository;

    @InjectMocks
    private FifoStockValuationService fifoStockValuationService;

    private Articles article;

    @BeforeEach
    void setUp() {
        article = new Articles(1L);
        article.setStockQuantity(15);
        article.setPurchasePrice(250);
        article.setName("Test");
        article.setMarque("M");
        article.setModel("X");
        article.setType("T");
    }

    @Test
    void consumeUsesFifoOrder() {
        var lot1 = buildLot(1L, 10, 200.0);
        var lot2 = buildLot(2L, 5, 250.0);

        when(lotRepository.findOpenLotsForArticleOrderByFifo(eq(1L), any()))
                .thenReturn(new ArrayList<>(List.of(lot1, lot2)));
        when(lotRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        FifoConsumptionResult result = fifoStockValuationService.consume(
                article,
                12,
                ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                "STOCK_REQUEST",
                99L);

        assertEquals(2500.0, result.getTotalCost());
        assertEquals(0, lot1.getQuantityRemaining());
        assertEquals(3, lot2.getQuantityRemaining());

        ArgumentCaptor<com.optimize.elykia.core.entity.stock.ArticleStockLotConsumption> captor =
                ArgumentCaptor.forClass(com.optimize.elykia.core.entity.stock.ArticleStockLotConsumption.class);
        verify(consumptionRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertEquals(10, captor.getAllValues().get(0).getQuantity());
        assertEquals(2, captor.getAllValues().get(1).getQuantity());
    }

    @Test
    void registerEntryCreatesOpenLot() {
        when(lotRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var lot = fifoStockValuationService.registerEntry(
                article, 5, 200.0, ArticleStockLotSourceType.STOCK_RECEPTION, null, null);

        assertEquals(5, lot.getQuantityInitial());
        assertEquals(5, lot.getQuantityRemaining());
        assertEquals(200.0, lot.getUnitPurchasePrice());
    }

    @Test
    void consumeFailsWhenInsufficientLots() {
        when(lotRepository.findOpenLotsForArticleOrderByFifo(eq(1L), any()))
                .thenReturn(List.of(buildLot(1L, 3, 200.0)));

        assertThrows(CustomValidationException.class, () -> fifoStockValuationService.consume(
                article,
                5,
                ArticleStockLotMovementType.WAREHOUSE_RELEASE,
                "STOCK_REQUEST",
                1L));
    }

    private static com.optimize.elykia.core.entity.stock.ArticleStockLot buildLot(Long id, int remaining, double price) {
        var lot = new com.optimize.elykia.core.entity.stock.ArticleStockLot();
        lot.setId(id);
        lot.setQuantityInitial(remaining);
        lot.setQuantityRemaining(remaining);
        lot.setUnitPurchasePrice(price);
        return lot;
    }
}
