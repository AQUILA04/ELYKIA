package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockRequestServiceTest {

    @Mock
    private StockRequestRepository repository;
    @Mock
    private ArticlesService articlesService;
    @Mock
    private CommercialMonthlyStockRepository monthlyStockRepository;
    @Mock
    private CommercialMonthlyStockItemRepository monthlyStockItemRepository;
    @Mock
    private UserService userService;
    @Mock
    private AccountingDayService accountingDayService;
    @Mock
    private StockMovementService stockMovementService;
    @Mock
    private StockValuationFacade stockValuationFacade;
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Mock
    private TemplateEngine templateEngine;
    @Mock
    private StockReturnRepository stockReturnRepository;
    @Mock
    private CommercialStockMovementService commercialStockMovementService;
    @Mock
    private CommercialMonthlyStockService commercialMonthlyStockService;
    @InjectMocks
    private StockRequestService service;

    @BeforeEach
    void setUp() {
        service.setCommercialMonthlyStockService(commercialMonthlyStockService);
        service.setCommercialStockMovementService(commercialStockMovementService);
        ReflectionTestUtils.setField(service, "monthlyStockItemRepository", monthlyStockItemRepository);
        ReflectionTestUtils.setField(service, "stockReturnRepository", stockReturnRepository);
    }

    @Test
    void createRequest_freezesCurrentPricesAndTotalsWhenNoPriorStockRemains() {
        // Given
        StockRequest request = requestWithArticle(5L, 2);
        Articles managedArticle = article(5L, 1_500.0, 800.0);
        when(repository.findMaxId()).thenReturn(15L);
        when(articlesService.getById(5L)).thenReturn(managedArticle);
        when(monthlyStockItemRepository.getUnitPriceByArticleId(5L, LocalDate.now().getMonthValue(),
                LocalDate.now().getYear(), "commercial.a")).thenReturn(null);
        when(monthlyStockItemRepository.getRemainingQuantityByArticleId(5L, LocalDate.now().getMonthValue(),
                LocalDate.now().getYear(), "commercial.a")).thenReturn(null);
        when(repository.save(request)).thenReturn(request);

        // When
        StockRequest created = service.createRequest(request);

        // Then
        StockRequestItem item = request.getItems().iterator().next();
        assertEquals(request, created);
        assertEquals(StockRequestStatus.CREATED, request.getStatus());
        assertEquals(LocalDate.now(), request.getRequestDate());
        assertEquals(LocalDate.now().getMonthValue(), request.getMonth());
        assertEquals(LocalDate.now().getYear(), request.getYear());
        assertTrue(request.getReference().matches("REQ-\\d{4}-\\d{2}-00000010"));
        assertEquals(managedArticle, item.getArticle());
        assertEquals(1_500.0, item.getUnitPrice());
        assertEquals(800.0, item.getPurchasePrice());
        assertEquals(3_000.0, request.getTotalCreditSalePrice());
        assertEquals(1_600.0, request.getTotalPurchasePrice());
        assertEquals(request, item.getStockRequest());
        verify(repository).save(request);
    }

    @Test
    void createRequest_rejectsNewPriceWhileTheCommercialStillHasTheOldPricedStock() {
        // Given
        StockRequest request = requestWithArticle(5L, 1);
        Articles managedArticle = article(5L, 1_500.0, 800.0);
        when(repository.findMaxId()).thenReturn(1L);
        when(articlesService.getById(5L)).thenReturn(managedArticle);
        when(monthlyStockItemRepository.getUnitPriceByArticleId(5L, LocalDate.now().getMonthValue(),
                LocalDate.now().getYear(), "commercial.a")).thenReturn(1_300.0);
        when(monthlyStockItemRepository.getRemainingQuantityByArticleId(5L, LocalDate.now().getMonthValue(),
                LocalDate.now().getYear(), "commercial.a")).thenReturn(1.0);

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.createRequest(request));

        // Then
        assertTrue(exception.getMessage().contains("ont changé"));
        assertTrue(exception.getMessage().contains("Ancien prix: 1300.0"));
    }

    @Test
    void validateRequest_nonCreatedRequestIsRejectedWithoutChangingItsStatus() {
        // Given
        StockRequest request = new StockRequest();
        request.setId(9L);
        request.setStatus(StockRequestStatus.VALIDATED);
        when(repository.findByIdWithItems(9L)).thenReturn(Optional.of(request));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.validateRequest(9L));

        // Then
        assertTrue(exception.getMessage().contains("créées"));
        assertEquals(StockRequestStatus.VALIDATED, request.getStatus());
    }

    @Test
    void deliverRequest_nonValidatedRequestIsRejectedBeforeStockDelivery() {
        // Given
        StockRequest request = new StockRequest();
        request.setId(11L);
        request.setStatus(StockRequestStatus.CREATED);
        when(repository.findByIdForUpdate(11L)).thenReturn(Optional.of(request));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.deliverRequest(11L));

        // Then
        assertTrue(exception.getMessage().contains("validée"));
        assertEquals(StockRequestStatus.CREATED, request.getStatus());
    }

    private StockRequest requestWithArticle(Long articleId, int quantity) {
        StockRequest request = new StockRequest();
        request.setCollector("commercial.a");
        StockRequestItem item = new StockRequestItem();
        item.setArticle(new Articles(articleId));
        item.setQuantity(quantity);
        request.addItem(item);
        return request;
    }

    private Articles article(Long id, double creditSalePrice, double purchasePrice) {
        Articles article = new Articles(id);
        article.setType("Pack");
        article.setMarque("Elykia");
        article.setModel("M1");
        article.setName("Produit");
        article.setCreditSalePrice(creditSalePrice);
        article.setPurchasePrice(purchasePrice);
        return article;
    }
}
