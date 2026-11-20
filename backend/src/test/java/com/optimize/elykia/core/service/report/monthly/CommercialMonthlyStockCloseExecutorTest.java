package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialMonthlyStockCloseExecutorTest {

    @Mock private CommercialMonthlyStockService monthlyStockService;
    @Mock private MonthlyReportAggregationService aggregationService;

    @Test
    void closesTheReportedMonthNotTheMonthThatJustStarted() {
        CommercialMonthlyStockCloseExecutor executor = executor();
        when(aggregationService.listActiveCommercials(2026, 10)).thenReturn(List.of("COM005", "COM006"));

        // Le traitement du 1er novembre clôture octobre.
        executor.closeMonthStocksSafely(2026, 10);

        verify(monthlyStockService).closeMonthStock("COM005", 2026, 10);
        verify(monthlyStockService).closeMonthStock("COM006", 2026, 10);
        verify(monthlyStockService, never()).closeCurrentMonthStock(anyString());
    }

    @Test
    void oneFailingCommercialDoesNotStopTheOthers() {
        CommercialMonthlyStockCloseExecutor executor = executor();
        when(aggregationService.listActiveCommercials(2026, 10)).thenReturn(List.of("COM005", "COM006"));
        doThrow(new IllegalStateException("déjà clôturé"))
                .when(monthlyStockService).closeMonthStock("COM005", 2026, 10);

        executor.closeMonthStocksSafely(2026, 10);

        verify(monthlyStockService).closeMonthStock("COM006", 2026, 10);
    }

    @Test
    void anUnavailableCommercialListIsLoggedNotThrown() {
        CommercialMonthlyStockCloseExecutor executor = executor();
        when(aggregationService.listActiveCommercials(2026, 10)).thenThrow(new IllegalStateException("base"));

        executor.closeMonthStocksSafely(2026, 10);

        verify(monthlyStockService, never()).closeMonthStock(anyString(), anyInt(), anyInt());
    }

    private CommercialMonthlyStockCloseExecutor executor() {
        CommercialMonthlyStockCloseExecutor executor =
                new CommercialMonthlyStockCloseExecutor(monthlyStockService, aggregationService);
        // Proxy transactionnel injecté par Spring en production : ici l'objet lui-même.
        ReflectionTestUtils.setField(executor, "self", executor);
        return executor;
    }
}
