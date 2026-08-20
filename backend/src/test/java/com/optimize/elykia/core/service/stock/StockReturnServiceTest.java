package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockReturn;
import com.optimize.elykia.core.entity.stock.StockReturnItem;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockReturnServiceTest {

    @Mock
    private StockReturnRepository repository;
    @Mock
    private ArticlesService articlesService;
    @Mock
    private CommercialMonthlyStockRepository monthlyStockRepository;
    @Mock
    private CommercialMonthlyStockItemRepository monthlyStockItemRepository;
    @Mock
    private UserService userService;
    @Mock
    private StockMovementService stockMovementService;
    @Mock
    private StockValuationFacade stockValuationFacade;
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Mock
    private User currentUser;
    @InjectMocks
    private StockReturnService service;

    @Test
    void createReturn_initializesLifecycleAndReattachesTheManagedArticle() {
        // Given
        Articles requestedArticle = new Articles(5L);
        Articles managedArticle = new Articles(5L);
        StockReturnItem item = new StockReturnItem();
        item.setArticle(requestedArticle);
        item.setQuantity(2);
        StockReturn stockReturn = new StockReturn();
        stockReturn.setId(7L);
        stockReturn.setCollector("commercial.a");
        stockReturn.addItem(item);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(articlesService.getOne(5L)).thenReturn(Optional.of(managedArticle));
        when(repository.save(stockReturn)).thenReturn(stockReturn);

        // When
        StockReturn created = service.createReturn(stockReturn);

        // Then
        assertEquals(stockReturn, created);
        assertEquals(StockReturnStatus.CREATED, stockReturn.getStatus());
        assertEquals(LocalDate.now(), stockReturn.getReturnDate());
        assertEquals(managedArticle, item.getArticle());
        assertEquals(stockReturn, item.getStockReturn());
        verify(repository).save(stockReturn);
    }

    @Test
    void validateReturn_processedReturnIsRejectedBeforeAnyStockMutation() {
        // Given
        StockReturn stockReturn = returnRequest(9L, StockReturnStatus.RECEIVED);
        when(repository.findByIdForUpdate(9L)).thenReturn(Optional.of(stockReturn));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class, () -> service.validateReturn(9L));

        // Then
        assertTrue(exception.getMessage().contains("déjà été traité"));
        verify(repository).findByIdForUpdate(9L);
        verify(monthlyStockRepository, never()).save(any());
        verify(stockMovementService, never()).recordMovement(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void cancelReturn_nonCreatedReturnIsRejectedWithoutPersistence() {
        // Given
        StockReturn stockReturn = returnRequest(10L, StockReturnStatus.RECEIVED);
        when(repository.findByIdWithItems(10L)).thenReturn(Optional.of(stockReturn));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class, () -> service.cancelReturn(10L));

        // Then
        assertTrue(exception.getMessage().contains("CREATED"));
        verify(repository, never()).save(stockReturn);
    }

    @Test
    void getKpis_aggregatesPendingReceivedCancelledAndRefusedReturns() {
        // Given
        when(repository.countByStatusFiltered(any(), any(), any(), any())).thenReturn(List.of(
                new Object[] {StockReturnStatus.CREATED, 2L},
                new Object[] {StockReturnStatus.RECEIVED, 3L},
                new Object[] {StockReturnStatus.CANCELLED, 1L},
                new Object[] {StockReturnStatus.REFUSED, 2L}));

        // When
        var kpis = service.getKpis("commercial.a", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        // Then
        assertEquals(8L, kpis.getTotal());
        assertEquals(2L, kpis.getPending());
        assertEquals(3L, kpis.getReceived());
        assertEquals(3L, kpis.getCancelledRefused());
    }

    private StockReturn returnRequest(Long id, StockReturnStatus status) {
        StockReturn stockReturn = new StockReturn();
        stockReturn.setId(id);
        stockReturn.setStatus(status);
        return stockReturn;
    }
}
