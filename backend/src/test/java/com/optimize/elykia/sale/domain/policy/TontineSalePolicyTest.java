package com.optimize.elykia.sale.domain.policy;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;
import com.optimize.elykia.sale.domain.SolvencyStatus;
import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TontineSalePolicyTest {

    private final SaleLifecyclePolicy policy = SaleLifecyclePolicies.forType(SaleType.TONTINE);

    @Test
    void resolvesToTontineSingletonPolicy() {
        assertSame(TontineSalePolicy.INSTANCE, policy);
        assertEquals(SaleType.TONTINE, policy.saleType());
        assertFalse(policy.publishesCreditStartedEvent());
    }

    @Test
    void newTontineSaleFactoryPopulatesSettledDeliveryState() {
        CreditArticles line = new CreditArticles();
        line.setQuantity(3);
        line.setUnitPrice(2_000.0);
        LocalDate saleDate = LocalDate.of(2026, 7, 10);

        Credit sale = Credit.newTontineSale(sampleClient(ClientType.CLIENT), "COM005", 6_000.0, 4_200.0, Set.of(line), saleDate);

        assertTrue(sale.isTontine());
        assertEquals(OperationType.TONTINE, sale.getType());
        assertEquals(CreditStatus.SETTLED, sale.getStatus());
        assertEquals(6_000.0, sale.getTotalAmount());
        assertEquals(6_000.0, sale.getTotalAmountPaid());
        assertEquals(0.0, sale.getTotalAmountRemaining());
        assertEquals(4_200.0, sale.getTotalPurchase());
        assertEquals(6_000.0, sale.getDailyStake());
        assertEquals(saleDate, sale.getBeginDate());
        assertEquals(saleDate, sale.getExpectedEndDate());
        assertEquals(saleDate, sale.getEffectiveEndDate());
        assertEquals(SolvencyStatus.TIME, sale.getSolvencyNote());
        assertEquals(0, sale.getRemainingDaysCount());
        assertTrue(sale.getDailyPaid());
        assertFalse(sale.getUpdatable());
        assertEquals(ClientType.CLIENT, sale.getClientType());
        assertSame(sale, line.getCredit());
    }

    @Test
    void statusOnStartDependsOnClientType() {
        Credit clientTontine = Credit.newTontineSale(sampleClient(ClientType.CLIENT), "COM005", 5_000.0, 3_000.0, Set.of(), LocalDate.now());
        clientTontine.start();
        assertEquals(CreditStatus.SETTLED, clientTontine.getStatus());
        assertNotNull(clientTontine.getAccountingDate());
        assertNotNull(clientTontine.getReleaseDate());

        Credit promoterTontine = new Credit();
        promoterTontine.setType(OperationType.TONTINE);
        promoterTontine.setClientType(ClientType.PROMOTER);
        promoterTontine.setStatus(CreditStatus.CREATED);
        promoterTontine.start();
        assertEquals(CreditStatus.INPROGRESS, promoterTontine.getStatus());
    }

    @Test
    void initializeFinancialTermsSetsFullSettlementForPendingTontineSale() {
        Credit tontine = new Credit();
        tontine.setType(OperationType.TONTINE);
        tontine.setStatus(CreditStatus.CREATED);
        tontine.setTotalAmount(12_000.0);
        LocalDate beginDate = LocalDate.of(2026, 8, 1);
        tontine.setBeginDate(beginDate);

        tontine.checkAdvance();

        assertEquals(0.0, tontine.getAdvance());
        assertEquals(12_000.0, tontine.getTotalAmountPaid());
        assertEquals(0.0, tontine.getTotalAmountRemaining());
        assertEquals(12_000.0, tontine.getDailyStake());
        assertEquals(0, tontine.getRemainingDaysCount());
        assertEquals(beginDate, tontine.getExpectedEndDate());
    }

    @Test
    void rejectsDailyStakeChangeButAllowsSoftDeleteAndInitialRecovery() {
        Credit tontine = Credit.newTontineSale(sampleClient(ClientType.CLIENT), "COM005", 5_000.0, 3_000.0, Set.of(), LocalDate.now());

        assertThrows(CustomValidationException.class, () -> policy.assertDailyStakeChangeAllowed(tontine));
        assertDoesNotThrow(() -> policy.assertSoftDeleteAllowed(tontine));
        assertDoesNotThrow(tontine::checkInProgressStatus);
    }

    @Test
    void resolveFallbackUnitPriceUsesCreditSalePrice() {
        Articles article = new Articles(3L);
        article.setCreditSalePrice(1_750.0);
        article.setSellingPrice(1_500.0);
        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        assertEquals(1_750.0, policy.resolveFallbackUnitPrice(line));

        article.setCreditSalePrice(0.0);
        assertEquals(0.0, policy.resolveFallbackUnitPrice(line));
        assertEquals(0.0, policy.resolveFallbackUnitPrice(null));
    }

    private static Client sampleClient(ClientType clientType) {
        Client client = new Client();
        client.setId(77L);
        client.setClientType(clientType);
        client.setCollector("COM005");
        return client;
    }
}
