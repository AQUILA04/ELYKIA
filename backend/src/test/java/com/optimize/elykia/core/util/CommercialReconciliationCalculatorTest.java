package com.optimize.elykia.core.util;

import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto.ReconciliationStatus;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CommercialReconciliationCalculatorTest {

    @Test
    void line_matchesFrontendRemainingRulesWithSurplusCoverage() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername("COM009");
        report.setCollectionsAmount(26_450.0);
        report.setCollectionsCount(22);
        report.setTotalAmountToDeposit(26_450.0);
        report.setTotalAmountDeposited(20_000.0);
        report.setTotalCreditAmountDeposited(20_000.0);
        report.setSurplusCoverageCredit(450.0);

        CommercialReconciliationLineDto line = CommercialReconciliationCalculator.line(report, "COM009", 0, 0, 0);

        assertEquals(26_450.0, line.creditToDeposit());
        assertEquals(6_000.0, line.remainingCredit());
        assertEquals(6_000.0, line.remaining());
        assertEquals(26_450.0, line.cashDue());
        assertEquals(ReconciliationStatus.LATE, line.status());
        assertEquals(22L, line.operationsCount());
    }

    @Test
    void line_addsCatchupsEnteredToCashDueAndOnlyUnpaidOnesToRemaining() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTontineCollectionsAmount(100_300.0);
        report.setTontineCollectionsCount(107);
        report.setTotalAmountToDeposit(100_300.0);
        report.setTotalAmountDeposited(100_300.0);
        report.setTotalTontineAmountDeposited(100_300.0);

        CommercialReconciliationLineDto line = CommercialReconciliationCalculator.line(
                report, "COM005", 13_300.0, 10_000.0, 0.0);

        assertEquals(113_600.0, line.cashDue());
        assertEquals(3_300.0, line.remainingCatchup());
        assertEquals(3_300.0, line.remaining());
        assertEquals(110_300.0, line.cashReceived());
        assertEquals(ReconciliationStatus.LATE, line.status());
    }

    @Test
    void line_cashReceivedRemovesContributionsDepositedOutsideThePeriod() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTotalAmountDeposited(150_000.0);

        CommercialReconciliationLineDto line = CommercialReconciliationCalculator.line(
                report, "COM005", 0.0, 50_000.0, 20_000.0);

        assertEquals(180_000.0, line.cashReceived());
    }

    @Test
    void line_reportsSurplusWhenNothingIsOwed() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTontineCollectionsAmount(20_600.0);
        report.setTontineCollectionsCount(2);
        report.setTotalAmountToDeposit(20_600.0);
        report.setTotalAmountDeposited(30_000.0);
        report.setTotalTontineAmountDeposited(20_600.0);
        report.setTotalSurplusAmountDeposited(9_400.0);

        CommercialReconciliationLineDto line = CommercialReconciliationCalculator.line(report, "COM006", 0, 0, 0);

        assertEquals(0.0, line.remaining());
        assertEquals(9_400.0, line.surplus());
        assertEquals(ReconciliationStatus.SURPLUS, line.status());
    }

    @Test
    void line_isInactiveWithoutOperationsNorMoney() {
        CommercialReconciliationLineDto line = CommercialReconciliationCalculator.line(
                new DailyCommercialReport(), "COM011", 0, 0, 0);

        assertEquals(ReconciliationStatus.INACTIVE, line.status());
    }

    @Test
    void line_withoutReportStillCountsCatchupsEntered() {
        CommercialReconciliationLineDto line = CommercialReconciliationCalculator.line(
                null, "COM012", 2_000.0, 0.0, 0.0);

        assertEquals(2_000.0, line.cashDue());
        assertEquals(2_000.0, line.remaining());
        assertEquals(ReconciliationStatus.LATE, line.status());
    }

    @Test
    void depositRate_isOneWhenNothingIsDueAndClampedOtherwise() {
        assertEquals(1.0, CommercialReconciliationCalculator.depositRate(0.0, 0.0));
        assertEquals(0.75, CommercialReconciliationCalculator.depositRate(100.0, 25.0));
        assertEquals(0.0, CommercialReconciliationCalculator.depositRate(100.0, 150.0));
    }
}
