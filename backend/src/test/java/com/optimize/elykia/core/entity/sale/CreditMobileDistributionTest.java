package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.DistributeArticleDto;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.enumaration.CreditStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreditMobileDistributionTest {

    @Test
    void buildDistribution_preservesMobileDailyStakeAndEndDate() {
        Client client = new Client();
        client.setId(1L);

        DistributeArticleDto dto = mobileDistributionDto(
                10_700.0,
                400.0,
                300.0,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 27));

        Credit credit = Credit.buildDistribution(client, dto);
        credit.setStatus(CreditStatus.CREATED);
        credit.checkAdvance();

        assertTrue(credit.isMobileFinancialTermsLocked());
        assertEquals(400.0, credit.getDailyStake());
        assertEquals(300.0, credit.getAdvance());
        assertEquals(10_400.0, credit.getTotalAmountRemaining());
        assertEquals(LocalDate.of(2026, 7, 27), credit.getExpectedEndDate());
        assertEquals(26, credit.getRemainingDaysCount());
    }

    @Test
    void checkAdvance_doesNotRecalculateMobileStakeFromRemainingOver30Days() {
        Credit credit = Credit.buildDistribution(new Client(), mobileDistributionDto(
                10_700.0,
                400.0,
                300.0,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 27)));
        credit.setStatus(CreditStatus.CREATED);

        credit.checkAdvance();

        assertEquals(400.0, credit.getDailyStake(), "La mise mobile ne doit pas être recalculée à 350");
    }

    @Test
    void applyMobileFinancialTerms_rejectsInvalidDailyStake() {
        DistributeArticleDto dto = mobileDistributionDto(
                10_700.0,
                400.0,
                300.0,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 27));
        dto.setDailyStake(0.0);

        Credit credit = new Credit();
        assertThrows(CustomValidationException.class, () -> credit.applyMobileFinancialTerms(dto));
    }

    @Test
    void applyMobileFinancialTerms_persistsLockFlagForReloadedEntity() {
        Credit credit = Credit.buildDistribution(new Client(), mobileDistributionDto(
                10_700.0,
                400.0,
                300.0,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 27)));

        assertTrue(credit.isMobileFinancialTermsLocked());

        Credit reloaded = new Credit();
        reloaded.setMobileFinancialTermsLocked(true);
        reloaded.setStatus(CreditStatus.CREATED);
        reloaded.setDailyStake(400.0);
        reloaded.checkAdvance();

        assertEquals(400.0, reloaded.getDailyStake());
    }

    @Test
    void start_initializesRemainingDaysCountWhenUnsetForNonMobileCredit() {
        Credit credit = new Credit();
        credit.setType(com.optimize.elykia.core.enumaration.OperationType.CREDIT);
        credit.setStatus(CreditStatus.VALIDATED);
        credit.setTotalAmount(10_000.0);
        credit.setDailyStake(400.0);

        credit.start();

        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
        assertEquals(30, credit.getRemainingDaysCount());
        assertEquals(LocalDate.now().plusDays(30), credit.getExpectedEndDate());
    }

    @Test
    void start_preservesMobileBeginAndExpectedEndDates() {
        Credit credit = Credit.buildDistribution(new Client(), mobileDistributionDto(
                10_700.0,
                400.0,
                300.0,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 27)));
        credit.setStatus(CreditStatus.VALIDATED);
        credit.setType(com.optimize.elykia.core.enumaration.OperationType.CREDIT);

        credit.start();

        assertEquals(LocalDate.of(2026, 7, 1), credit.getBeginDate());
        assertEquals(LocalDate.of(2026, 7, 27), credit.getExpectedEndDate());
        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
    }

    private static DistributeArticleDto mobileDistributionDto(
            double totalAmount,
            double dailyStake,
            double advance,
            LocalDate startDate,
            LocalDate endDate) {
        DistributeArticleDto dto = new DistributeArticleDto();
        dto.setMobile(true);
        dto.setClientId(1L);
        dto.setTotalAmount(totalAmount);
        dto.setDailyStake(dailyStake);
        dto.setAdvance(advance);
        dto.setTotalAmountPaid(advance);
        dto.setTotalAmountRemaining(totalAmount - advance);
        dto.setStartDate(startDate);
        dto.setEndDate(endDate);

        StockEntry entry = new StockEntry();
        entry.setArticleId(99L);
        entry.setQuantity(1);
        StockEntryDto articles = new StockEntryDto();
        articles.setArticleEntries(Set.of(entry));
        dto.setArticles(articles);
        return dto;
    }
}
