package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockTontineRequestServiceTest {

    @Mock
    private StockTontineRequestRepository repository;
    @Mock
    private UserService userService;
    @Mock
    private User currentUser;
    @Mock
    private TontineStockService tontineStockService;
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Mock
    private ArticlesService articlesService;
    @Mock
    private StockMovementService stockMovementService;
    @Mock
    private StockValuationFacade stockValuationFacade;
    @Mock
    private AccountingDayService accountingDayService;
    @Mock
    private TemplateEngine templateEngine;
    @Mock
    private PdfHtmlRenderer pdfHtmlRenderer;
    @InjectMocks
    private StockTontineRequestService service;

    @Test
    void save_newRequestInitializesLifecycleReferenceFrozenPricesAndTotals() {
        // Given
        Articles requestedArticle = article(7L, null, null, null, null, null, null);
        Articles managedArticle = article(7L, "Produit", "Pack", "Elykia", "Familial", 1_500.0, 800.0);
        StockTontineRequestItem item = new StockTontineRequestItem();
        item.setArticle(requestedArticle);
        item.setQuantity(3);
        item.setUnitPrice(0.0);
        item.setPurchasePrice(null);
        StockTontineRequest request = new StockTontineRequest();
        request.addItem(item);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("collecteur.tontine");
        when(repository.findMaxId()).thenReturn(15L);
        when(articlesService.getById(7L)).thenReturn(managedArticle);
        when(repository.save(request)).thenReturn(request);

        // When
        StockTontineRequest saved = service.save(request);

        // Then
        assertEquals(request, saved);
        assertEquals(StockRequestStatus.CREATED, request.getStatus());
        assertEquals(LocalDate.now(), request.getRequestDate());
        assertTrue(request.getReference().matches("TRQ-\\d{4}-\\d{2}-00000010"));
        assertEquals(managedArticle, item.getArticle());
        assertEquals("Pack: Elykia Familial Produit", item.getItemName());
        assertEquals(1_500.0, item.getUnitPrice());
        assertEquals(800.0, item.getPurchasePrice());
        assertEquals(4_500.0, request.getTotalSalePrice());
        assertEquals(2_400.0, request.getTotalPurchasePrice());
        assertEquals(request, item.getStockTontineRequest());
        verify(repository).save(request);
    }

    @Test
    void validate_createdRequestMovesItToValidatedAndRecordsTheDate() {
        // Given
        StockTontineRequest request = request(12L, StockRequestStatus.CREATED);
        when(repository.findByIdWithItems(12L)).thenReturn(Optional.of(request));

        // When
        service.validate(12L);

        // Then
        assertEquals(StockRequestStatus.VALIDATED, request.getStatus());
        assertEquals(LocalDate.now(), request.getValidationDate());
        verify(repository).saveAndFlush(request);
    }

    @Test
    void validate_nonCreatedRequestIsRejectedWithoutPersistence() {
        // Given
        StockTontineRequest request = request(12L, StockRequestStatus.DELIVERED);
        when(repository.findByIdWithItems(12L)).thenReturn(Optional.of(request));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class, () -> service.validate(12L));

        // Then
        assertTrue(exception.getMessage().contains("CREATED"));
        verify(repository).findByIdWithItems(12L);
    }

    @Test
    void deliver_nonValidatedRequestIsRejectedBeforeAnyStockOperation() {
        // Given
        StockTontineRequest request = request(20L, StockRequestStatus.CREATED);
        when(repository.findByIdForUpdate(20L)).thenReturn(Optional.of(request));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class, () -> service.deliver(20L));

        // Then
        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("VALIDATED"));
        verify(repository).findByIdForUpdate(20L);
    }

    private Articles article(Long id, String name, String type, String marque, String model,
            Double creditSalePrice, Double purchasePrice) {
        Articles article = new Articles();
        article.setId(id);
        article.setName(name);
        article.setType(type);
        article.setMarque(marque);
        article.setModel(model);
        if (creditSalePrice != null) {
            article.setCreditSalePrice(creditSalePrice);
        }
        if (purchasePrice != null) {
            article.setPurchasePrice(purchasePrice);
        }
        return article;
    }

    private StockTontineRequest request(Long id, StockRequestStatus status) {
        StockTontineRequest request = new StockTontineRequest();
        request.setId(id);
        request.setStatus(status);
        return request;
    }
}
