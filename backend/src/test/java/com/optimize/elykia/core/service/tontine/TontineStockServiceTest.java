package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.enumaration.StockOperation;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.stock.TontineStockMovementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineStockServiceTest {

    @Mock
    private TontineStockRepository tontineStockRepository;
    @Mock
    private UserService userService;
    @Mock
    private TontineStockMovementService tontineStockMovementService;
    @InjectMocks
    private TontineStockService service;

    @Test
    void validateTontineStockAvailability_rejectsEveryArticleMissingOrInsufficient() {
        // Given
        CreditArticles missingArticle = missingCreditArticle(1L, "Réfrigérateur");
        CreditArticles insufficientArticle = namedCreditArticle(2L, 5, "Téléviseur");
        when(tontineStockRepository.getArticleForCommercial(1L, "collector.a")).thenReturn(null);
        when(tontineStockRepository.getArticleForCommercial(2L, "collector.a"))
                .thenReturn(stock(12L, "collector.a", 2L, "Téléviseur", 4));

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.validateTontineStockAvailability(
                        List.of(missingArticle, insufficientArticle), "collector.a"));
        assertEquals("L'article(s) Réfrigérateur, Téléviseur n'est pas disponible(s) ou quantité insuffisante pour le stock du commercial",
                exception.getMessage());
    }

    @Test
    void updateArticleStock_addsQuantityAndPersistsUpdatedStock() {
        // Given
        CreditArticles creditArticle = creditArticle(1L, 3);
        TontineStock existingStock = stock(12L, "collector.a", 1L, "Réfrigérateur", 5);
        when(tontineStockRepository.getArticleForCommercial(1L, "collector.a")).thenReturn(existingStock);
        when(tontineStockRepository.saveAndFlush(existingStock)).thenReturn(existingStock);

        // When
        TontineStock result = service.updateArticleStock(creditArticle, "collector.a", StockOperation.ADD);

        // Then
        assertEquals(8, result.getAvailableQuantity());
        assertEquals(8, result.getTotalQuantity());
        verify(tontineStockRepository).saveAndFlush(existingStock);
    }

    @Test
    void getStock_returnsOnlyPositiveAvailableQuantityForCurrentYear() {
        // Given
        TontineStock available = stock(12L, "collector.a", 1L, "Réfrigérateur", 2);
        TontineStock depleted = stock(13L, "collector.a", 2L, "Téléviseur", 0);
        when(tontineStockRepository.findByCommercialAndYear("collector.a", LocalDate.now().getYear()))
                .thenReturn(List.of(available, depleted));

        // When
        List<TontineStock> result = service.getStock("collector.a");

        // Then
        assertEquals(List.of(available), result);
        verify(tontineStockRepository).findByCommercialAndYear("collector.a", LocalDate.now().getYear());
    }

    @Test
    void deductTontineStockForDelivery_updatesStockLinksCreditArticleAndRecordsMovement() {
        // Given
        CreditArticles creditArticle = creditArticle(1L, 2);
        TontineStock existingStock = stock(12L, "collector.a", 1L, "Réfrigérateur", 5);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(44L);
        delivery.setReference("LIV-2026-08-0001");
        when(tontineStockRepository.getArticleForCommercial(1L, "collector.a")).thenReturn(existingStock);
        when(tontineStockRepository.saveAndFlush(existingStock)).thenReturn(existingStock);

        // When
        service.deductTontineStockForDelivery(
                List.of(creditArticle), "collector.a", 90L, "CR-2026-0001", delivery);

        // Then
        assertEquals(3, existingStock.getAvailableQuantity());
        assertEquals(2, existingStock.getDistributedQuantity());
        verify(creditArticle).setTontineItemId(12L);
        verify(tontineStockMovementService).record(
                12L, 90L, "CR-2026-0001", null, null, null, 44L, "LIV-2026-08-0001",
                "collector.a", 1L, "Réfrigérateur", TontineStockMovementType.TONTINE_DELIVERY, 5, 2, 3);
    }

    private CreditArticles namedCreditArticle(Long articleId, int quantity, String commercialName) {
        Articles article = mock(Articles.class);
        when(article.getCommercialName()).thenReturn(commercialName);
        CreditArticles creditArticle = creditArticle(articleId, quantity);
        when(creditArticle.getArticles()).thenReturn(article);
        return creditArticle;
    }

    private CreditArticles missingCreditArticle(Long articleId, String commercialName) {
        Articles article = mock(Articles.class);
        when(article.getCommercialName()).thenReturn(commercialName);
        CreditArticles creditArticle = mock(CreditArticles.class);
        when(creditArticle.getArticlesId()).thenReturn(articleId);
        when(creditArticle.getArticles()).thenReturn(article);
        return creditArticle;
    }

    private CreditArticles creditArticle(Long articleId, int quantity) {
        CreditArticles creditArticle = mock(CreditArticles.class);
        when(creditArticle.getArticlesId()).thenReturn(articleId);
        when(creditArticle.getQuantity()).thenReturn(quantity);
        return creditArticle;
    }

    private TontineStock stock(Long id, String commercial, Long articleId, String articleName, int availableQuantity) {
        TontineStock stock = new TontineStock();
        stock.setId(id);
        stock.setCommercial(commercial);
        stock.setArticleId(articleId);
        stock.setArticleName(articleName);
        stock.setYear(2026);
        stock.setTotalQuantity(availableQuantity);
        stock.setAvailableQuantity(availableQuantity);
        stock.setDistributedQuantity(0);
        stock.setQuantityReturned(0);
        stock.setWeightedAverageUnitPrice(0.0);
        return stock;
    }
}
