package com.optimize.elykia.finance.application;

import com.optimize.elykia.finance.web.dto.CatchupCashAdjustmentDto;
import com.optimize.elykia.finance.web.dto.CatchupCashAdjustmentLineDto;
import com.optimize.elykia.finance.web.dto.CommercialYearlySummaryDto;
import com.optimize.elykia.finance.web.dto.CommercialCockpitDto;
import com.optimize.elykia.finance.web.dto.CommercialCockpitDto.AlertType;
import com.optimize.elykia.finance.web.dto.CommercialReconciliationLineDto.ReconciliationStatus;
import com.optimize.elykia.finance.web.dto.CommercialReportSummaryDto;
import com.optimize.elykia.finance.web.dto.TeamYearlySummaryDto;
import com.optimize.elykia.finance.domain.Expense;
import com.optimize.elykia.finance.domain.ExpenseType;
import com.optimize.elykia.finance.domain.DailyCommercialReport;
import com.optimize.elykia.finance.infrastructure.persistence.DailyCommercialReportRepository;
import com.optimize.elykia.finance.infrastructure.persistence.ExpenseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialCockpitServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 19);

    @Mock private DailyCommercialReportRepository reportRepository;
    @Mock private CashDepositService cashDepositService;
    @Mock private CashSurplusReallocationService surplusReallocationService;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private CommercialReportMonthlyService monthlyService;
    @InjectMocks private CommercialCockpitService service;

    @BeforeEach
    void noCatchupsByDefault() {
        lenient().when(cashDepositService.catchupCashAdjustment(any(), any()))
                .thenReturn(CatchupCashAdjustmentDto.empty());
        lenient().when(expenseRepository.findByExpenseDateBetween(any(), any())).thenReturn(List.of());
    }

    @Test
    void cockpit_buildsLinesTotalsAndAlertsSortedByUrgency() {
        when(reportRepository.findAggregatedByDateBetween(DAY, DAY)).thenReturn(new ArrayList<>(List.of(
                tontine("COM005", 100_300.0, 100_300.0, 0.0),
                tontine("COM006", 20_600.0, 30_000.0, 9_400.0),
                credit("COM009", 26_450.0, 20_000.0))));

        CommercialCockpitDto cockpit = service.cockpit(DAY, DAY, null, false, true);

        assertEquals(List.of("COM009", "COM006", "COM005"),
                cockpit.lines().stream().map(line -> line.commercialUsername()).toList());
        assertEquals(ReconciliationStatus.LATE, cockpit.lines().get(0).status());
        assertEquals(ReconciliationStatus.SURPLUS, cockpit.lines().get(1).status());
        assertEquals(147_350.0, cockpit.totals().cashDue());
        assertEquals(150_300.0, cockpit.totals().deposited());
        assertEquals(6_450.0, cockpit.totals().remaining());
        assertEquals(9_400.0, cockpit.totals().surplus());
        assertEquals(3, cockpit.totals().commercialsCount());
        assertNull(cockpit.previousTotals());
        assertEquals(AlertType.SURPLUS, cockpit.alerts().get(0).type());
        assertEquals(AlertType.REMAINING, cockpit.alerts().get(1).type());
        assertEquals(6_450.0, cockpit.alerts().get(1).amount());
        verify(surplusReallocationService).attachHistoricalRemaining(any(), eq(DAY));
    }

    @Test
    void cockpit_cashBalanceExcludesSupplyExpenses() {
        when(reportRepository.findAggregatedByDateBetween(DAY, DAY)).thenReturn(new ArrayList<>(List.of(
                tontine("COM005", 100_000.0, 100_000.0, 0.0))));
        when(expenseRepository.findByExpenseDateBetween(DAY, DAY)).thenReturn(List.of(
                expense(" approvisionnement ", 40_000), expense("Transport", 5_000)));

        CommercialCockpitDto cockpit = service.cockpit(DAY, DAY, null, false, true);

        assertEquals(100_000.0, cockpit.cash().received());
        assertEquals(45_000.0, cockpit.cash().expensesWithSupply());
        assertEquals(5_000.0, cockpit.cash().expensesWithoutSupply());
        assertEquals(95_000.0, cockpit.cash().balance());
    }

    @Test
    void cockpit_filtersOneCommercialButKeepsCashForTheWholeTeam() {
        when(reportRepository.findAggregatedByDateBetween(DAY, DAY)).thenReturn(new ArrayList<>(List.of(
                tontine("COM005", 100_300.0, 100_300.0, 0.0),
                credit("COM009", 26_450.0, 20_000.0))));

        CommercialCockpitDto cockpit = service.cockpit(DAY, DAY, "com009", false, true);

        assertEquals(1, cockpit.lines().size());
        assertEquals("COM009", cockpit.lines().get(0).commercialUsername());
        assertEquals(26_450.0, cockpit.totals().cashDue());
        assertEquals(120_300.0, cockpit.cash().received());
    }

    @Test
    void cockpit_withoutCashForPromoterSkipsExpenses() {
        when(reportRepository.findAggregatedByDateBetween(DAY, DAY)).thenReturn(new ArrayList<>());

        CommercialCockpitDto cockpit = service.cockpit(DAY, DAY, "COM005", false, false);

        assertNull(cockpit.cash());
        verify(expenseRepository, never()).findByExpenseDateBetween(any(), any());
    }

    @Test
    void cockpit_comparesWithThePreviousPeriodOfTheSameLength() {
        LocalDate start = LocalDate.of(2026, 11, 16);
        LocalDate end = LocalDate.of(2026, 11, 19);
        when(reportRepository.findAggregatedByDateBetween(start, end)).thenReturn(new ArrayList<>(List.of(
                credit("COM009", 4_000.0, 4_000.0))));
        when(reportRepository.findAggregatedByDateBetween(LocalDate.of(2026, 11, 12), LocalDate.of(2026, 11, 15)))
                .thenReturn(new ArrayList<>(List.of(credit("COM009", 2_000.0, 1_000.0))));

        CommercialCockpitDto cockpit = service.cockpit(start, end, null, true, false);

        assertNotNull(cockpit.previousTotals());
        assertEquals(2_000.0, cockpit.previousTotals().cashDue());
        assertEquals(1_000.0, cockpit.previousTotals().remaining());
    }

    @Test
    void cockpit_addsCatchupsEnteredAndCommercialsWithOnlyCatchups() {
        when(reportRepository.findAggregatedByDateBetween(DAY, DAY)).thenReturn(new ArrayList<>(List.of(
                tontine("COM005", 100_300.0, 100_300.0, 0.0))));
        CatchupCashAdjustmentDto adjustment = new CatchupCashAdjustmentDto(0.0, 0.0, 0.0, 5_000.0,
                new ArrayList<>(List.of(
                        new CatchupCashAdjustmentLineDto("COM005", 0.0, 0.0, 3_000.0),
                        new CatchupCashAdjustmentLineDto("COM012", 0.0, 0.0, 2_000.0))));
        when(cashDepositService.catchupCashAdjustment(DAY, DAY)).thenReturn(adjustment);

        CommercialCockpitDto cockpit = service.cockpit(DAY, DAY, null, false, false);

        assertEquals(2, cockpit.lines().size());
        assertEquals(105_300.0, cockpit.totals().cashDue());
        assertEquals(5_000.0, cockpit.totals().catchupEntered());
        assertEquals(5_000.0, cockpit.totals().remaining());
        assertTrue(cockpit.alerts().stream().allMatch(alert -> alert.type() == AlertType.CATCHUP_NOT_DEPOSITED));
    }

    @Test
    void summary_returnsSevenDaySeriesEndingOnThePeriodEnd() {
        when(reportRepository.findAggregatedByDateBetweenAndCommercialUsername("COM005", DAY, DAY))
                .thenReturn(new ArrayList<>(List.of(tontine("COM005", 1_000.0, 1_000.0, 0.0))));
        DailyCommercialReport yesterday = tontine("COM005", 800.0, 500.0, 0.0);
        yesterday.setDate(DAY.minusDays(1));
        when(reportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc("COM005", DAY.minusDays(6), DAY))
                .thenReturn(List.of(yesterday));

        CommercialReportSummaryDto summary = service.summary("COM005", DAY, DAY);

        assertEquals(7, summary.series().size());
        assertEquals(DAY.minusDays(6), summary.series().get(0).date());
        assertEquals(800.0, summary.series().get(5).amountToDeposit());
        assertEquals(500.0, summary.series().get(5).deposited());
        assertEquals(0.0, summary.series().get(6).amountToDeposit());
        assertEquals(ReconciliationStatus.UP_TO_DATE, summary.line().status());
        assertNotNull(summary.activity());
    }

    @Test
    void teamYearlySummary_sumsEachCommercialPortfolio() {
        when(reportRepository.findDistinctCommercialsBetween(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(List.of("COM005", "COM009"));
        when(monthlyService.getYearlySummary("COM005", 2026)).thenReturn(yearly(73_000, 53_400, 19_600));
        when(monthlyService.getYearlySummary("COM009", 2026)).thenReturn(yearly(27_000, 20_000, 7_000));

        TeamYearlySummaryDto team = service.teamYearlySummary(2026);

        assertEquals(2, team.commercialsCount());
        assertEquals(100_000.0, team.entrustedPortfolioAmount());
        assertEquals(73_400.0, team.creditDepositedAmount());
        assertEquals(26_600.0, team.remainingAtClientAmount());
    }

    private static DailyCommercialReport tontine(String username, double toDeposit, double deposited,
            double surplus) {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername(username);
        report.setTontineCollectionsAmount(toDeposit);
        report.setTontineCollectionsCount(1);
        report.setTotalAmountToDeposit(toDeposit);
        report.setTotalAmountDeposited(deposited);
        report.setTotalTontineAmountDeposited(deposited - surplus);
        report.setTotalSurplusAmountDeposited(surplus);
        return report;
    }

    private static DailyCommercialReport credit(String username, double toDeposit, double deposited) {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername(username);
        report.setCollectionsAmount(toDeposit);
        report.setCollectionsCount(1);
        report.setTotalAmountToDeposit(toDeposit);
        report.setTotalAmountDeposited(deposited);
        report.setTotalCreditAmountDeposited(deposited);
        return report;
    }

    private static Expense expense(String typeName, double amount) {
        ExpenseType type = new ExpenseType();
        type.setName(typeName);
        Expense expense = new Expense();
        expense.setExpenseType(type);
        expense.setAmount(BigDecimal.valueOf(amount));
        return expense;
    }

    private static CommercialYearlySummaryDto yearly(double entrusted, double deposited, double atClient) {
        return CommercialYearlySummaryDto.builder()
                .year(2026)
                .entrustedPortfolioAmount(entrusted)
                .totalCreditDepositedAmount(deposited)
                .remainingAtCommercialAmount(entrusted - deposited)
                .remainingAtClientAmount(atClient)
                .build();
    }
}
