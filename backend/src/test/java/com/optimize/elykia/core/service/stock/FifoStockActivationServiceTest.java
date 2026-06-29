package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FifoStockActivationServiceTest {

    @Mock
    private ArticlesRepository articlesRepository;

    @Mock
    private ArticleStockLotRepository lotRepository;

    @Mock
    private StockReceptionItemRepository stockReceptionItemRepository;

    @Mock
    private FifoStockValuationService fifoStockValuationService;

    @Mock
    private StockValuationFacade stockValuationFacade;

    @InjectMocks
    private FifoStockActivationService fifoStockActivationService;

    @Test
    void activateFailsWhenFifoFlagDisabled() {
        when(stockValuationFacade.isFifoEnabled()).thenReturn(false);

        assertThrows(CustomValidationException.class, () -> fifoStockActivationService.activate());
    }

    @Test
    void activateCreatesMigrationLotWhenNoReceptionHistory() {
        Articles article = new Articles(7L);
        article.setStockQuantity(10);
        article.setPurchasePrice(200.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(lotRepository.existsByArticleId(7L)).thenReturn(false);
        when(stockReceptionItemRepository.findByArticleIdOrderByReceptionDateAsc(7L))
                .thenReturn(List.of());
        when(fifoStockValuationService.registerEntry(
                eq(article), eq(10), eq(200.0), eq(ArticleStockLotSourceType.MIGRATION), eq(null), eq(null)))
                .thenReturn(new ArticleStockLot());

        Map<String, Object> result = fifoStockActivationService.activate();

        assertEquals(1, result.get("migratedArticles"));
        verify(fifoStockValuationService).assertLotQuantityMatchesArticle(article);
    }

    @Test
    void activateSkipsArticlesThatAlreadyHaveLots() {
        Articles article = new Articles(3L);
        article.setStockQuantity(5);
        article.setPurchasePrice(150.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(lotRepository.existsByArticleId(3L)).thenReturn(true);

        Map<String, Object> result = fifoStockActivationService.activate();

        assertEquals(1, result.get("skippedArticles"));
        verify(fifoStockValuationService, never()).registerEntry(
                any(Articles.class),
                anyInt(),
                anyDouble(),
                any(ArticleStockLotSourceType.class),
                any(),
                any());
    }
}
