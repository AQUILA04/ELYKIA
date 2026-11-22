package com.optimize.elykia.sale.domain.policy;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditPurpose;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;
import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreditSalePolicyTest {

    private final SaleLifecyclePolicy policy = SaleLifecyclePolicies.forType(SaleType.CREDIT);

    @Test
    void resolvesToCreditSingletonPolicy() {
        assertSame(CreditSalePolicy.INSTANCE, policy);
        assertEquals(SaleType.CREDIT, policy.saleType());
        assertTrue(policy.publishesCreditStartedEvent());

        Credit defaultCredit = new Credit();
        assertSame(CreditSalePolicy.INSTANCE, SaleLifecyclePolicies.forCredit(defaultCredit));
    }

    @Test
    void initializeFinancialTermsComputesDailyStakeAndRemainingSchedule() {
        Credit credit = Credit.newCredit(sampleClient(), Set.of(), 2_000.0, CreditPurpose.BUSINESS);
        credit.setTotalAmount(11_000.0);
        LocalDate beginDate = LocalDate.of(2026, 5, 1);
        credit.setBeginDate(beginDate);

        credit.checkAdvance();

        assertEquals(2_000.0, credit.getAdvance());
        assertEquals(2_000.0, credit.getTotalAmountPaid());
        assertEquals(9_000.0, credit.getTotalAmountRemaining());
        assertEquals(300.0, credit.getDailyStake());
        assertEquals(30, credit.getRemainingDaysCount());
        assertEquals(beginDate.plusDays(30), credit.getExpectedEndDate());
        assertEquals(CreditPurpose.BUSINESS, credit.getCreditPurpose());
    }

    @Test
    void initializeFinancialTermsSkipsWhenNotCreatedOrValidatedOrWhenMobileLocked() {
        Credit inProgress = new Credit();
        inProgress.setType(OperationType.CREDIT);
        inProgress.setStatus(CreditStatus.INPROGRESS);
        inProgress.setTotalAmount(15_000.0);
        inProgress.setDailyStake(500.0);
        inProgress.checkAdvance();
        assertEquals(500.0, inProgress.getDailyStake());

        Credit locked = new Credit();
        locked.setType(OperationType.CREDIT);
        locked.setStatus(CreditStatus.CREATED);
        locked.setMobileFinancialTermsLocked(true);
        locked.setDailyStake(450.0);
        locked.checkAdvance();
        assertNotNull(locked.getBeginDate());
        assertEquals(450.0, locked.getDailyStake());
    }

    @Test
    void startRequiresValidatedStatusAndTransitionsToInProgress() {
        Credit credit = Credit.newCredit(sampleClient(), Set.of(), 0.0, CreditPurpose.PERSONAL);
        assertThrows(ApplicationException.class, credit::start);

        credit.validate();
        credit.start();

        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
        assertEquals(CreditStatus.INPROGRESS, policy.statusOnStart(credit));
        assertNotNull(credit.getBeginDate());
        assertNotNull(credit.getAccountingDate());
        assertNotNull(credit.getReleaseDate());
        assertEquals(30, credit.getRemainingDaysCount());
    }

    @Test
    void checkInProgressStatusRejectsNonInProgressCredit() {
        Credit credit = Credit.newCredit(sampleClient(), Set.of(), 0.0, CreditPurpose.PERSONAL);
        assertThrows(ApplicationException.class, credit::checkInProgressStatus);

        credit.setStatus(CreditStatus.INPROGRESS);
        assertDoesNotThrow(credit::checkInProgressStatus);
    }

    @Test
    void resolveFallbackUnitPriceUsesOnlyCreditSalePrice() {
        Articles article = new Articles(1L);
        article.setCreditSalePrice(1_500.0);
        article.setSellingPrice(1_200.0);
        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        assertEquals(1_500.0, policy.resolveFallbackUnitPrice(line));

        article.setCreditSalePrice(0.0);
        assertEquals(0.0, policy.resolveFallbackUnitPrice(line));
        assertEquals(0.0, policy.resolveFallbackUnitPrice(null));
    }

    @Test
    void allowsDailyStakeChangeAndSoftDelete() {
        Credit credit = Credit.newCredit(sampleClient(), Set.of(), 0.0, CreditPurpose.PERSONAL);
        assertDoesNotThrow(() -> policy.assertDailyStakeChangeAllowed(credit));
        assertDoesNotThrow(() -> policy.assertSoftDeleteAllowed(credit));
    }

    private static Client sampleClient() {
        Client client = new Client();
        client.setId(42L);
        client.setClientType(ClientType.CLIENT);
        client.setCollector("COM001");
        return client;
    }
}
