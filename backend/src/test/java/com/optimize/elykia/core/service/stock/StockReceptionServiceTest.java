package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.StockReceptionDto;
import com.optimize.elykia.core.dto.StockReceptionValidateRequest;
import com.optimize.elykia.core.dto.stock.PackagingEntryResolution;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ReceptionStatus;
import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;
import com.optimize.elykia.core.mapper.StockReceptionMapper;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockReceptionServiceTest {

    @Mock private StockReceptionRepository repository;
    @Mock private StockReceptionMapper mapper;
    @Mock private StockValuationFacade stockValuationFacade;
    @Mock private ArticlePackagingPricingService articlePackagingPricingService;
    @Mock private ArticlesService articlesService;
    @Mock private ArticleHistoryService articleHistoryService;
    @Mock private ExpenseService expenseService;
    @Mock private ExpenseTypeRepository expenseTypeRepository;
    @Mock private UserService userService;
    @Mock private StockReceptionItemRepository stockReceptionItemRepository;

    @Spy
    @InjectMocks
    private StockReceptionService stockReceptionService;

    private StockReception pendingReception;
    private Articles article;
    private StockReceptionItem item;

    @BeforeEach
    void setUp() {
        article = new Articles();
        article.setId(1L);
        article.setName("Article 1");
        article.setStockQuantity(10);
        article.setPurchasePrice(120.0);

        item = new StockReceptionItem();
        item.setId(10L);
        item.setArticle(article);
        item.setQuantity(5);
        item.setUnitPrice(100.0);
        item.setTotalPrice(500.0);
        item.setEntryPackagingMode(StockEntryPackagingMode.UNIT);

        pendingReception = new StockReception();
        pendingReception.setId(99L);
        pendingReception.setReference("RCP-TEST");
        pendingReception.setStatus(ReceptionStatus.PENDING);
        pendingReception.setReceivedBy("storekeeper");
        pendingReception.setTotalAmount(500.0);
        pendingReception.setItems(new HashSet<>(Set.of(item)));
        item.setStockReception(pendingReception);
    }

    @Test
    void validateReception_ShouldApplyStockAndSetValidated() {
        User manager = userWithProfiles("manager", UserProfilConstant.GESTIONNAIRE);
        when(repository.findByIdWithItems(99L)).thenReturn(Optional.of(pendingReception));
        when(userService.getCurrentUser()).thenReturn(manager);
        when(stockValuationFacade.lockAndIsFifoEnabled()).thenReturn(false);
        when(stockValuationFacade.isFifoEnabled()).thenReturn(false);
        doNothing().when(stockReceptionService).applyStockReception(pendingReception, "manager");
        when(mapper.toDto(pendingReception)).thenReturn(new StockReceptionDto());

        stockReceptionService.validateReception(99L, null);

        assertThat(pendingReception.getStatus()).isEqualTo(ReceptionStatus.VALIDATED);
        assertThat(pendingReception.getValidatedBy()).isEqualTo("manager");
        verify(stockReceptionService).applyStockReception(pendingReception, "manager");
    }

    @Test
    void refuseReception_ShouldSetRefusedWithoutStockImpact() {
        User manager = userWithProfiles("manager", UserProfilConstant.GESTIONNAIRE);
        when(userService.getCurrentUser()).thenReturn(manager);
        doReturn(pendingReception).when(stockReceptionService).getById(99L);
        when(mapper.toDto(pendingReception)).thenReturn(new StockReceptionDto());

        stockReceptionService.refuseReception(99L, "Stock incorrect");

        assertThat(pendingReception.getStatus()).isEqualTo(ReceptionStatus.REFUSED);
        assertThat(pendingReception.getRefusalReason()).isEqualTo("Stock incorrect");
        verify(stockReceptionService, never()).applyStockReception(any(), any());
    }

    @Test
    void cancelReception_PendingByCreator_ShouldCancelWithoutReverse() {
        User storekeeper = userWithProfiles("storekeeper", UserProfilConstant.MAGASINIER);
        when(userService.getCurrentUser()).thenReturn(storekeeper);
        when(repository.findByIdWithItems(99L)).thenReturn(Optional.of(pendingReception));

        stockReceptionService.cancelReception(99L);

        assertThat(pendingReception.getStatus()).isEqualTo(ReceptionStatus.CANCELLED);
        verify(stockValuationFacade, never()).cancelEntry(any());
        verify(articlesService, never()).update(any());
    }

    @Test
    void cancelReception_ValidatedByNonAdmin_ShouldFail() {
        pendingReception.setStatus(ReceptionStatus.VALIDATED);
        User manager = userWithProfiles("manager", UserProfilConstant.GESTIONNAIRE);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(repository.findByIdWithItems(99L)).thenReturn(Optional.of(pendingReception));

        assertThatThrownBy(() -> stockReceptionService.cancelReception(99L))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("administrateur");
    }

    @Test
    void validateReception_WhenNotPending_ShouldFail() {
        pendingReception.setStatus(ReceptionStatus.REFUSED);
        when(repository.findByIdWithItems(99L)).thenReturn(Optional.of(pendingReception));

        assertThatThrownBy(() -> stockReceptionService.validateReception(99L, null))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void applyStockReception_Legacy_ShouldUseCatalogPriceAtValidation() {
        article.setPurchasePrice(120.0); // catalogue changed since creation (snapshot was 100)
        when(stockValuationFacade.lockAndIsFifoEnabled()).thenReturn(false);
        when(articlesService.getById(1L)).thenReturn(article);

        ExpenseType expenseType = new ExpenseType();
        expenseType.setId(7L);
        expenseType.setName("Approvisionnement");
        when(expenseTypeRepository.findByName("Approvisionnement")).thenReturn(Optional.of(expenseType));

        stockReceptionService.applyStockReception(pendingReception, "manager");

        assertThat(item.getUnitPrice()).isEqualTo(120.0);
        assertThat(item.getTotalPrice()).isEqualTo(600.0);
        assertThat(pendingReception.getTotalAmount()).isEqualTo(600.0);
        assertThat(article.getPurchasePrice()).isEqualTo(120.0);
        assertThat(article.getStockQuantity()).isEqualTo(15);

        verify(stockValuationFacade).registerEntry(
                eq(article),
                eq(5),
                eq(120.0),
                eq(ArticleStockLotSourceType.STOCK_RECEPTION),
                eq(item),
                any());
        verify(articleHistoryService).create(any());
        verify(articlesService).update(article);

        ArgumentCaptor<ExpenseDto> expenseCaptor = ArgumentCaptor.forClass(ExpenseDto.class);
        verify(expenseService).createExpense(expenseCaptor.capture());
        assertThat(expenseCaptor.getValue().getAmount()).isEqualByComparingTo(BigDecimal.valueOf(600.0));
        assertThat(expenseCaptor.getValue().getDescription()).contains("PU:120.0");
    }

    @Test
    void applyStockReception_Fifo_ShouldKeepSnapshotUnitPriceAndRecalcTotal() {
        article.setPurchasePrice(120.0);
        when(stockValuationFacade.lockAndIsFifoEnabled()).thenReturn(true);
        when(articlesService.getById(1L)).thenReturn(article);

        ExpenseType expenseType = new ExpenseType();
        expenseType.setId(7L);
        expenseType.setName("Approvisionnement");
        when(expenseTypeRepository.findByName("Approvisionnement")).thenReturn(Optional.of(expenseType));

        stockReceptionService.applyStockReception(pendingReception, "manager");

        assertThat(item.getUnitPrice()).isEqualTo(100.0);
        assertThat(item.getTotalPrice()).isEqualTo(500.0);
        assertThat(pendingReception.getTotalAmount()).isEqualTo(500.0);
        assertThat(article.getPurchasePrice()).isEqualTo(100.0);

        verify(stockValuationFacade).registerEntry(
                eq(article),
                eq(5),
                eq(100.0),
                eq(ArticleStockLotSourceType.STOCK_RECEPTION),
                eq(item),
                any());

        ArgumentCaptor<ExpenseDto> expenseCaptor = ArgumentCaptor.forClass(ExpenseDto.class);
        verify(expenseService).createExpense(expenseCaptor.capture());
        assertThat(expenseCaptor.getValue().getAmount()).isEqualByComparingTo(BigDecimal.valueOf(500.0));
    }

    @Test
    void applyFifoValidationPrices_BodyUnitPrice_KeepsExactManagerValueNotCatalog() {
        article.setPurchasePrice(120.0);
        when(articlesService.getById(1L)).thenReturn(article);
        when(articlePackagingPricingService.resolveFifoEntry(eq(article), any()))
                .thenAnswer(invocation -> {
                    var entry = invocation.getArgument(1, com.optimize.elykia.core.dto.StockEntry.class);
                    return new PackagingEntryResolution(
                            5,
                            entry.getUnitPrice(),
                            entry.getUnitPrice() * 5,
                            StockEntryPackagingMode.UNIT,
                            null,
                            null,
                            null,
                            null);
                });

        StockReceptionValidateRequest request = new StockReceptionValidateRequest();
        StockReceptionValidateRequest.Line line = new StockReceptionValidateRequest.Line();
        line.setItemId(10L);
        line.setUnitPrice(180.0);
        request.setItems(List.of(line));

        stockReceptionService.applyFifoValidationPrices(pendingReception, request);

        assertThat(item.getUnitPrice()).isEqualTo(180.0);
        assertThat(item.getTotalPrice()).isEqualTo(900.0);
        assertThat(pendingReception.getTotalAmount()).isEqualTo(900.0);
    }

    @Test
    void applyFifoValidationPrices_EmptyBody_FallsBackToCatalog() {
        article.setPurchasePrice(120.0);
        when(articlesService.getById(1L)).thenReturn(article);
        when(articlePackagingPricingService.resolveFifoEntry(eq(article), any()))
                .thenAnswer(invocation -> {
                    var entry = invocation.getArgument(1, com.optimize.elykia.core.dto.StockEntry.class);
                    return new PackagingEntryResolution(
                            5,
                            entry.getUnitPrice(),
                            entry.getUnitPrice() * 5,
                            StockEntryPackagingMode.UNIT,
                            null,
                            null,
                            null,
                            null);
                });

        stockReceptionService.applyFifoValidationPrices(pendingReception, null);

        assertThat(item.getUnitPrice()).isEqualTo(120.0);
        assertThat(item.getTotalPrice()).isEqualTo(600.0);
        assertThat(pendingReception.getTotalAmount()).isEqualTo(600.0);
    }

    @Test
    void applyFifoValidationPrices_Wholesale_UsesExactPackagePriceFromBody() {
        item.setEntryPackagingMode(StockEntryPackagingMode.WHOLESALE);
        item.setPackageCount(2);
        item.setPackagePrice(1000.0);
        item.setQuantity(20);
        item.setUnitsPerPackageSnapshot(10);
        item.setPackagingTypeSnapshot(ArticlePackagingType.CARTON);
        article.setPackagingType(ArticlePackagingType.CARTON);
        article.setUnitsPerPackage(10);
        article.setWholesalePurchasePrice(900.0);
        article.setPurchasePrice(100.0);

        when(articlesService.getById(1L)).thenReturn(article);
        when(articlePackagingPricingService.resolveFifoEntry(eq(article), any()))
                .thenAnswer(invocation -> {
                    var entry = invocation.getArgument(1, com.optimize.elykia.core.dto.StockEntry.class);
                    double packagePrice = entry.getPackagePrice();
                    int count = entry.getPackageCount();
                    int qty = count * 10;
                    double unitPrice = packagePrice / 10.0;
                    return new PackagingEntryResolution(
                            qty,
                            unitPrice,
                            packagePrice * count,
                            StockEntryPackagingMode.WHOLESALE,
                            count,
                            packagePrice,
                            ArticlePackagingType.CARTON,
                            10);
                });

        StockReceptionValidateRequest request = new StockReceptionValidateRequest();
        StockReceptionValidateRequest.Line line = new StockReceptionValidateRequest.Line();
        line.setItemId(10L);
        line.setPackagePrice(1100.0); // différent du catalogue 900
        request.setItems(List.of(line));

        stockReceptionService.applyFifoValidationPrices(pendingReception, request);

        assertThat(item.getPackagePrice()).isEqualTo(1100.0);
        assertThat(item.getUnitPrice()).isEqualTo(110.0);
        assertThat(item.getTotalPrice()).isEqualTo(2200.0);
        assertThat(pendingReception.getTotalAmount()).isEqualTo(2200.0);
    }

    @Test
    void validateReception_Fifo_AppliesBodyThenStock() {
        User manager = userWithProfiles("manager", UserProfilConstant.GESTIONNAIRE);
        when(repository.findByIdWithItems(99L)).thenReturn(Optional.of(pendingReception));
        when(userService.getCurrentUser()).thenReturn(manager);
        when(stockValuationFacade.lockAndIsFifoEnabled()).thenReturn(true);
        when(stockValuationFacade.isFifoEnabled()).thenReturn(true);
        doNothing().when(stockReceptionService).applyFifoValidationPrices(eq(pendingReception), any());
        doNothing().when(stockReceptionService).applyStockReception(pendingReception, "manager");
        when(mapper.toDto(pendingReception)).thenReturn(new StockReceptionDto());

        StockReceptionValidateRequest request = new StockReceptionValidateRequest();
        StockReceptionValidateRequest.Line line = new StockReceptionValidateRequest.Line();
        line.setItemId(10L);
        line.setUnitPrice(180.0);
        request.setItems(List.of(line));

        stockReceptionService.validateReception(99L, request);

        verify(stockReceptionService).applyFifoValidationPrices(pendingReception, request);
        verify(stockReceptionService).applyStockReception(pendingReception, "manager");
        assertThat(pendingReception.getStatus()).isEqualTo(ReceptionStatus.VALIDATED);
    }

    private User userWithProfiles(String username, String... profiles) {
        User user = org.mockito.Mockito.mock(User.class);
        lenient().when(user.getUsername()).thenReturn(username);
        for (String profile : profiles) {
            lenient().when(user.is(profile)).thenReturn(true);
        }
        return user;
    }
}
