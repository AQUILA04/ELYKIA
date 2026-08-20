package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.enumaration.StockStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.stock.CommercialMonthlyStockRecoveryService;
import com.optimize.common.securities.security.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialMonthlyStockServiceTest {

    @Mock
    private CommercialMonthlyStockRepository repository;
    @Mock
    private UserService userService;
    @Mock
    private CommercialMonthlyStockRecoveryService recoveryService;
    @Mock
    private ArticlesRepository articlesRepository;
    @Mock
    private CashDepositRepository cashDepositRepository;
    @InjectMocks
    private CommercialMonthlyStockService service;

    @Test
    void closeCurrentMonthStock_closesActiveCurrentStock() {
        // Given
        LocalDate now = LocalDate.now();
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setStatus(StockStatus.ACTIVE);
        when(repository.findByCollectorAndMonthAndYear("collector.a", now.getMonthValue(), now.getYear()))
                .thenReturn(Optional.of(stock));

        // When
        service.closeCurrentMonthStock("collector.a");

        // Then
        assertEquals(StockStatus.CLOSED, stock.getStatus());
        verify(repository).save(stock);
    }

    @Test
    void closeCurrentMonthStock_rejectsStockAlreadyClosedWithoutPersistence() {
        // Given
        LocalDate now = LocalDate.now();
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setStatus(StockStatus.CLOSED);
        when(repository.findByCollectorAndMonthAndYear("collector.a", now.getMonthValue(), now.getYear()))
                .thenReturn(Optional.of(stock));

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.closeCurrentMonthStock("collector.a"));
        assertEquals("Le stock de ce mois est déjà clôturé.", exception.getMessage());
        verify(repository, never()).save(any(CommercialMonthlyStock.class));
    }

    @Test
    void enrichWithRecovery_preservesRecoveryMetricsAndRoundsCreditDepositsUpward() {
        // Given
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setCollector("collector.a");
        stock.setYear(2026);
        stock.setMonth(8);
        StockRecoverySummaryDto sourceSummary = StockRecoverySummaryDto.builder()
                .totalDueAmount(1_000.0)
                .totalRecoveredAmount(400.0)
                .totalRemainingAmount(600.0)
                .recoveryRatePercent(40.0)
                .remainingFromPhysicalStock(150.0)
                .recoveredFromSales(250.0)
                .remainingFromCredits(350.0)
                .build();
        when(recoveryService.aggregate(stock)).thenReturn(sourceSummary);
        when(cashDepositRepository.sumCreditDepositsForPeriod(
                "collector.a", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31))).thenReturn(42.1);

        // When
        CommercialMonthlyStock result = service.enrichWithRecovery(stock);

        // Then
        assertSame(stock, result);
        StockRecoverySummaryDto summary = result.getRecoverySummary();
        assertEquals(1_000.0, summary.getTotalDueAmount());
        assertEquals(400.0, summary.getTotalRecoveredAmount());
        assertEquals(600.0, summary.getTotalRemainingAmount());
        assertEquals(43.0, summary.getTotalCreditDepositedAmount());
    }
}
