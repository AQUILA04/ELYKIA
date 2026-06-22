package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CashDepositCategoryCalculatorTest {

    @Test
    void creditToDeposit_excludesNewAccountsBalance() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTotalAdvancesAmount(1000.0);
        report.setCollectionsAmount(500.0);
        report.setTotalReliquatGeneratedAmount(200.0);
        report.setTotalReliquatUsedAmount(50.0);
        report.setNewAccountsBalance(3000.0);
        report.setTontineCollectionsAmount(800.0);

        assertEquals(1650.0, CashDepositCategoryCalculator.creditToDeposit(report));
        assertEquals(800.0, CashDepositCategoryCalculator.tontineToDeposit(report));
        assertEquals(3000.0, CashDepositCategoryCalculator.newBalanceToDeposit(report));
    }

    @Test
    void validateCategorySplit_rejectsMismatch() {
        assertThrows(IllegalArgumentException.class, () -> CashDepositCategoryCalculator.validateCategorySplit(
                1000.0, 500.0, 200.0, 100.0, 0.0));
    }

    @Test
    void validateCategorySplit_acceptsSurplus() {
        CashDepositCategoryCalculator.validateCategorySplit(1000.0, 500.0, 200.0, 100.0, 200.0);
    }

    @Test
    void remainingByCategory_usesDepositedTotals() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTotalAdvancesAmount(1000.0);
        report.setTontineCollectionsAmount(500.0);
        report.setNewAccountsBalance(200.0);
        report.setTotalCreditAmountDeposited(400.0);
        report.setTotalTontineAmountDeposited(100.0);
        report.setTotalNewBalanceAmountDeposited(50.0);

        assertEquals(600.0, CashDepositCategoryCalculator.remainingCredit(report));
        assertEquals(400.0, CashDepositCategoryCalculator.remainingTontine(report));
        assertEquals(150.0, CashDepositCategoryCalculator.remainingNewBalance(report));
    }
}
