package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.report.CommercialYearlySummaryDto;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CommercialReportMonthlyRepository;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialYearlyPortfolioServiceTest {

    @Mock private CommercialReportMonthlyRepository monthlyRepository;
    @Mock private CreditRepository creditRepository;
    @Mock private CreditCollectorHistoryRepository collectorHistoryRepository;

    private CommercialYearlyPortfolioService service;

    @BeforeEach
    void setUp() {
        service = new CommercialYearlyPortfolioService(
                monthlyRepository, creditRepository, collectorHistoryRepository);
    }

    @Test
    void buildYearlySummary_computesEntrustedPortfolioAndRemainingCommercial() {
        when(monthlyRepository.sumYearlyTotals("COM_A", 2026))
                .thenReturn(List.<Object[]>of(new Object[]{100_000.0, 1, 40_000.0}));

        LocalDate yearStart = LocalDate.of(2026, 1, 1);
        LocalDateTime periodStart = yearStart.atStartOfDay();
        LocalDateTime periodEnd = yearStart.plusYears(1).atStartOfDay();

        when(creditRepository.sumOpeningStockAtDate("COM_A", yearStart, periodStart)).thenReturn(10_000.0);
        when(collectorHistoryRepository.sumCreditsReceivedInPeriod("COM_A", periodStart, periodEnd)).thenReturn(0.0);
        when(collectorHistoryRepository.sumCreditsCededInPeriod("COM_A", periodStart, periodEnd)).thenReturn(60_000.0);
        when(creditRepository.sumTotalAmountPaidForCollector("COM_A", OperationType.CREDIT, State.ENABLED))
                .thenReturn(40_000.0);
        when(creditRepository.sumLiveRemainingAtClients("COM_A", OperationType.CREDIT, State.ENABLED))
                .thenReturn(List.<Object[]>of(new Object[]{0L, 0.0}));

        CommercialYearlySummaryDto result = service.buildYearlySummary("COM_A", 2026);

        assertThat(result.getOpeningStockAmount()).isEqualTo(10_000.0);
        assertThat(result.getTotalCreditSalesAmount()).isEqualTo(100_000.0);
        assertThat(result.getCreditsCededAmount()).isEqualTo(60_000.0);
        assertThat(result.getEntrustedPortfolioAmount()).isEqualTo(50_000.0);
        assertThat(result.getTotalCreditDepositedAmount()).isEqualTo(40_000.0);
        assertThat(result.getRemainingAtCommercialAmount()).isEqualTo(10_000.0);
    }

    @Test
    void buildYearlySummary_receiverGetsReceivedCreditsInPortfolio() {
        when(monthlyRepository.sumYearlyTotals("COM_B", 2026))
                .thenReturn(List.<Object[]>of(new Object[]{0.0, 0, 0.0}));

        LocalDate yearStart = LocalDate.of(2026, 1, 1);
        LocalDateTime periodStart = yearStart.atStartOfDay();
        LocalDateTime periodEnd = yearStart.plusYears(1).atStartOfDay();

        when(creditRepository.sumOpeningStockAtDate(eq("COM_B"), eq(yearStart), eq(periodStart))).thenReturn(0.0);
        when(collectorHistoryRepository.sumCreditsReceivedInPeriod("COM_B", periodStart, periodEnd))
                .thenReturn(60_000.0);
        when(collectorHistoryRepository.sumCreditsCededInPeriod("COM_B", periodStart, periodEnd)).thenReturn(0.0);
        when(creditRepository.sumTotalAmountPaidForCollector("COM_B", OperationType.CREDIT, State.ENABLED))
                .thenReturn(0.0);
        when(creditRepository.sumLiveRemainingAtClients("COM_B", OperationType.CREDIT, State.ENABLED))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 60_000.0}));

        CommercialYearlySummaryDto result = service.buildYearlySummary("COM_B", 2026);

        assertThat(result.getCreditsReceivedAmount()).isEqualTo(60_000.0);
        assertThat(result.getEntrustedPortfolioAmount()).isEqualTo(60_000.0);
        assertThat(result.getRemainingAtCommercialAmount()).isEqualTo(60_000.0);
        assertThat(result.getRemainingAtClientAmount()).isEqualTo(60_000.0);
    }
}
