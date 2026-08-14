package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.report.CommercialTontineYearlySummaryDto;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialTontineYearlySummaryServiceTest {

    @Mock private TontineCollectionRepository tontineCollectionRepository;
    @Mock private DailyCommercialReportRepository dailyCommercialReportRepository;

    private CommercialTontineYearlySummaryService service;

    @BeforeEach
    void setUp() {
        service = new CommercialTontineYearlySummaryService(
                tontineCollectionRepository, dailyCommercialReportRepository);
    }

    @Test
    void buildYearlySummary_computesCollectedDepositedAndRemaining() {
        when(tontineCollectionRepository.sumYearlyCollectionsByCommercial(
                "COM_A",
                State.ENABLED,
                LocalDateTime.of(2026, 1, 1, 0, 0),
                LocalDateTime.of(2027, 1, 1, 0, 0)))
                .thenReturn(List.<Object[]>of(new Object[]{100_000.0, 12L}));
        when(dailyCommercialReportRepository.sumTontineDepositedByCommercialAndDateBetween(
                "COM_A", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(80_000.0);

        CommercialTontineYearlySummaryDto result = service.buildYearlySummary("COM_A", 2026);

        assertThat(result.getTotalTontineCollectionsAmount()).isEqualTo(100_000.0);
        assertThat(result.getTotalTontineCollectionsCount()).isEqualTo(12L);
        assertThat(result.getTotalTontineDepositedAmount()).isEqualTo(80_000.0);
        assertThat(result.getRemainingAtCommercialAmount()).isEqualTo(20_000.0);
    }

    @Test
    void buildYearlySummary_returnsZeroesWhenThereIsNoActivity() {
        when(tontineCollectionRepository.sumYearlyCollectionsByCommercial(
                "COM_EMPTY",
                State.ENABLED,
                LocalDateTime.of(2026, 1, 1, 0, 0),
                LocalDateTime.of(2027, 1, 1, 0, 0)))
                .thenReturn(List.of());
        when(dailyCommercialReportRepository.sumTontineDepositedByCommercialAndDateBetween(
                "COM_EMPTY", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(null);

        CommercialTontineYearlySummaryDto result = service.buildYearlySummary("COM_EMPTY", 2026);

        assertThat(result.getTotalTontineCollectionsAmount()).isZero();
        assertThat(result.getTotalTontineCollectionsCount()).isZero();
        assertThat(result.getTotalTontineDepositedAmount()).isZero();
        assertThat(result.getRemainingAtCommercialAmount()).isZero();
    }
}
