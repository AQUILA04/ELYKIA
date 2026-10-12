package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
    void activateCreatesMigrationLotEqualToStockQuantity() {
        Articles article = new Articles(7L);
        article.setName("Roulement");
        article.setStockQuantity(10);
        article.setPurchasePrice(200.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(articlesRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(article));
        when(lotRepository.sumRemainingQuantityByArticleId(7L)).thenReturn(0);
        when(fifoStockValuationService.registerEntry(
                eq(article),
                eq(10),
                eq(200.0),
                eq(ArticleStockLotSourceType.MIGRATION),
                isNull(),
                any(LocalDate.class)))
                .thenReturn(new ArticleStockLot());

        Map<String, Object> result = fifoStockActivationService.activate();

        assertEquals(1, result.get("migratedArticles"));
        assertEquals(0, result.get("skippedArticles"));
        verify(fifoStockValuationService).assertLotQuantityMatchesArticle(article);
        ArgumentCaptor<LocalDate> dateCaptor = ArgumentCaptor.forClass(LocalDate.class);
        verify(fifoStockValuationService).registerEntry(
                eq(article),
                eq(10),
                eq(200.0),
                eq(ArticleStockLotSourceType.MIGRATION),
                isNull(),
                dateCaptor.capture());
        assertEquals(LocalDate.now(), dateCaptor.getValue());
    }

    @Test
    void activateSkipsArticlesWithZeroStock() {
        Articles article = new Articles(3L);
        article.setStockQuantity(0);
        article.setPurchasePrice(150.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));

        Map<String, Object> result = fifoStockActivationService.activate();

        assertEquals(0, result.get("migratedArticles"));
        verify(fifoStockValuationService, never()).registerEntry(
                any(Articles.class),
                anyInt(),
                anyDouble(),
                any(ArticleStockLotSourceType.class),
                any(),
                any());
    }

    @Test
    void activateSkipsWhenOpenLotsAlreadyMatchStock() {
        Articles article = new Articles(3L);
        article.setStockQuantity(5);
        article.setPurchasePrice(150.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(articlesRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(article));
        when(lotRepository.sumRemainingQuantityByArticleId(3L)).thenReturn(5);

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

    @Test
    void activateFailsWhenOpenLotsDifferFromStock() {
        Articles article = new Articles(9L);
        article.setName("Disque");
        article.setStockQuantity(10);
        article.setPurchasePrice(100.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(articlesRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(article));
        when(lotRepository.sumRemainingQuantityByArticleId(9L)).thenReturn(4);

        CustomValidationException ex = assertThrows(
                CustomValidationException.class,
                () -> fifoStockActivationService.activate());

        assertTrue(ex.getMessage().contains("Disque"));
        assertTrue(ex.getMessage().contains("lots ouverts=4"));
        verify(fifoStockValuationService, never()).registerEntry(
                any(Articles.class),
                anyInt(),
                anyDouble(),
                any(ArticleStockLotSourceType.class),
                any(),
                any());
    }

    @Test
    void activateFailsWhenPurchasePriceMissingAndNoValidatedReception() {
        Articles article = new Articles(11L);
        article.setName("SansPrix");
        article.setStockQuantity(8);
        article.setPurchasePrice(0.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(articlesRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(article));
        when(lotRepository.sumRemainingQuantityByArticleId(11L)).thenReturn(0);
        when(stockReceptionItemRepository
                .findValidatedWithPositiveUnitPriceByArticleIdOrderByReceptionDateDesc(11L))
                .thenReturn(List.of());

        CustomValidationException ex = assertThrows(
                CustomValidationException.class,
                () -> fifoStockActivationService.activate());

        assertTrue(ex.getMessage().contains("SansPrix"));
        assertTrue(ex.getMessage().contains("prix d'achat manquant"));
        verify(fifoStockValuationService, never()).registerEntry(
                any(Articles.class),
                anyInt(),
                anyDouble(),
                any(ArticleStockLotSourceType.class),
                any(),
                any());
    }

    @Test
    void activateUsesLastValidatedReceptionPriceWhenCatalogPriceMissing() {
        Articles article = new Articles(12L);
        article.setStockQuantity(6);
        article.setPurchasePrice(0.0);

        StockReceptionItem receptionItem = new StockReceptionItem();
        receptionItem.setUnitPrice(175.0);

        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        when(articlesRepository.findAll()).thenReturn(List.of(article));
        when(articlesRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(article));
        when(lotRepository.sumRemainingQuantityByArticleId(12L)).thenReturn(0);
        when(stockReceptionItemRepository
                .findValidatedWithPositiveUnitPriceByArticleIdOrderByReceptionDateDesc(12L))
                .thenReturn(List.of(receptionItem));
        when(fifoStockValuationService.registerEntry(
                eq(article),
                eq(6),
                eq(175.0),
                eq(ArticleStockLotSourceType.MIGRATION),
                isNull(),
                any(LocalDate.class)))
                .thenReturn(new ArticleStockLot());

        Map<String, Object> result = fifoStockActivationService.activate();

        assertEquals(1, result.get("migratedArticles"));
        verify(fifoStockValuationService).registerEntry(
                eq(article),
                eq(6),
                eq(175.0),
                eq(ArticleStockLotSourceType.MIGRATION),
                isNull(),
                any(LocalDate.class));
    }
}
