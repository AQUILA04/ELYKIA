package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserPermissionConstant;
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
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.service.sale.CreditService;
import org.mockito.ArgumentMatchers;
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
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
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
    private User currentUser;
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
    @Mock
    private CreditService creditService;
    @InjectMocks
    private StockRequestService service;

    @BeforeEach
    void setUp() {
        service.setCommercialMonthlyStockService(commercialMonthlyStockService);
        service.setCommercialStockMovementService(commercialStockMovementService);
        service.setCreditService(creditService);
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

    @Test
    void cancelRequest_deliveredRequestIsRejectedWithoutChangingItsStatus() {
        StockRequest request = new StockRequest();
        request.setId(21L);
        request.setStatus(StockRequestStatus.DELIVERED);
        when(repository.findByIdWithItems(21L)).thenReturn(Optional.of(request));

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.cancelRequest(21L));

        assertTrue(exception.getMessage().contains("livrée"));
        assertEquals(StockRequestStatus.DELIVERED, request.getStatus());
    }

    @Test
    void cancelRequest_validatedRequestWithoutPermissionIsRejected() {
        StockRequest request = new StockRequest();
        request.setId(22L);
        request.setStatus(StockRequestStatus.VALIDATED);
        when(repository.findByIdWithItems(22L)).thenReturn(Optional.of(request));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getPermissions()).thenReturn(Set.of());

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.cancelRequest(22L));

        assertTrue(exception.getMessage().contains("droit"));
        assertEquals(StockRequestStatus.VALIDATED, request.getStatus());
    }

    @Test
    void cancelRequest_validatedRequestWithPermissionIsCancelled() {
        StockRequest request = new StockRequest();
        request.setId(23L);
        request.setStatus(StockRequestStatus.VALIDATED);
        when(repository.findByIdWithItems(23L)).thenReturn(Optional.of(request));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getPermissions()).thenReturn(Set.of(
                new UserPermission(UserPermissionConstant.CANCEL_VALIDATED_STOCK_REQUEST)));

        service.cancelRequest(23L);

        assertEquals(StockRequestStatus.CANCELLED, request.getStatus());
        verify(repository).save(request);
    }

    @Test
    void createValidatedCashSaleRequest_usesTheCashPriceAndSkipsManagerValidation() {
        Credit credit = new Credit();
        credit.setReference("CSH-9");
        credit.setCollector("commercial.a");
        CreditArticles line = new CreditArticles();
        line.setArticles(article(5L, 1_500.0, 800.0));
        line.setQuantity(2);
        line.setUnitPrice(100.0);
        credit.setArticles(Set.of(line));
        when(repository.findMaxId()).thenReturn(3L);
        when(repository.save(ArgumentMatchers.any(StockRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StockRequest created = service.createValidatedCashSaleRequest(credit);

        StockRequestItem item = created.getItems().iterator().next();
        assertEquals(StockRequestStatus.VALIDATED, created.getStatus());
        assertEquals("CSH-9", created.getCashSaleReference());
        assertTrue(created.getNote().contains("CSH-9"));
        assertTrue(created.getReference().matches("REQ-\\d{4}-\\d{2}-00000004"));
        assertEquals(100.0, item.getUnitPrice());
        assertEquals(200.0, created.getTotalCreditSalePrice());
        assertEquals(credit, created.getCredit());
    }

    @Test
    void updateRequest_rejectsACashSaleExit() {
        StockRequest request = new StockRequest();
        request.setId(4L);
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setCredit(new Credit());
        when(repository.findByIdWithItems(4L)).thenReturn(Optional.of(request));

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.updateRequest(4L, new StockRequest()));

        assertTrue(exception.getMessage().contains("vente comptant"));
        assertEquals(StockRequestStatus.VALIDATED, request.getStatus());
    }

    @Test
    void cancelRequest_cashSaleDelegatesToTheSaleCancellation() {
        Credit credit = new Credit();
        credit.setId(8L);
        StockRequest request = new StockRequest();
        request.setId(24L);
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setCredit(credit);
        when(repository.findByIdWithItems(24L)).thenReturn(Optional.of(request));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getPermissions()).thenReturn(Set.of(
                new UserPermission(UserPermissionConstant.CANCEL_VALIDATED_STOCK_REQUEST)));

        service.cancelRequest(24L);

        verify(creditService).cancelPendingCashSale(8L);
        verify(repository, never()).save(request);
    }

    @Test
    void deliverRequest_cashSaleShortStockDoesNotSettle() {
        Credit credit = new Credit();
        credit.setId(8L);
        StockRequest request = requestWithArticle(5L, 2);
        request.setId(11L);
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setCredit(credit);
        Articles article = article(5L, 100.0, 40.0);
        article.setStockQuantity(1);
        article.setReservedQuantity(2);
        when(repository.findByIdForUpdate(11L)).thenReturn(Optional.of(request));
        when(stockValuationFacade.lockAndIsFifoEnabled()).thenReturn(false);
        when(articlesService.lockById(5L)).thenReturn(article);

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.deliverRequest(11L));

        assertTrue(exception.getMessage().contains("ne couvre pas"));
        assertEquals(StockRequestStatus.VALIDATED, request.getStatus());
        assertEquals(1, article.getStockQuantity());
        verify(creditService, never()).settleCashSaleOnDelivery(ArgumentMatchers.any());
    }

    @Test
    void deliverRequest_cashSaleSettlesWithoutFeedingTheCommercialBag() {
        Credit credit = new Credit();
        credit.setId(8L);
        credit.setReference("CSH-8");
        StockRequest request = requestWithArticle(5L, 2);
        request.setId(12L);
        request.setReference("REQ-CASH");
        request.setCollector("commercial.a");
        request.setStatus(StockRequestStatus.VALIDATED);
        request.setCredit(credit);
        Articles article = article(5L, 100.0, 40.0);
        article.setStockQuantity(4);
        article.setReservedQuantity(2);
        when(repository.findByIdForUpdate(12L)).thenReturn(Optional.of(request));
        when(stockValuationFacade.lockAndIsFifoEnabled()).thenReturn(false);
        when(articlesService.lockById(5L)).thenReturn(article);
        when(stockValuationFacade.consume(
                ArgumentMatchers.eq(article),
                ArgumentMatchers.eq(2),
                ArgumentMatchers.eq(ArticleStockLotMovementType.WAREHOUSE_RELEASE),
                ArgumentMatchers.eq("STOCK_REQUEST"),
                ArgumentMatchers.eq(12L)))
                .thenReturn(FifoConsumptionResult.builder().averageUnitCost(40).quantityConsumed(2).totalCost(80).build());
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("magasinier");
        when(repository.save(request)).thenReturn(request);

        service.deliverRequest(12L);

        assertEquals(StockRequestStatus.DELIVERED, request.getStatus());
        assertEquals(2, article.getStockQuantity());
        assertEquals(0, article.getReservedQuantity());
        verify(creditService).settleCashSaleOnDelivery(8L);
        verify(monthlyStockRepository, never()).findByCollectorAndMonthAndYear(
                ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any());
        verify(stockMovementService).recordMovement(
                ArgumentMatchers.eq(article),
                ArgumentMatchers.eq(MovementType.RELEASE),
                ArgumentMatchers.eq(2),
                ArgumentMatchers.contains("CSH-8"),
                ArgumentMatchers.eq("magasinier"),
                ArgumentMatchers.eq(credit),
                ArgumentMatchers.eq(40.0),
                ArgumentMatchers.any());
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
