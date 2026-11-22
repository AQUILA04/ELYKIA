package com.optimize.elykia.sale.domain.policy;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleType;
import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CashSalePolicyTest {

    private final SaleLifecyclePolicy policy = SaleLifecyclePolicies.forType(SaleType.CASH);

    @Test
    void resolvesToCashSingletonPolicy() {
        assertSame(CashSalePolicy.INSTANCE, policy);
        assertEquals(SaleType.CASH, policy.saleType());
        assertFalse(policy.publishesCreditStartedEvent());
        assertEquals(CreditStatus.SETTLED, policy.statusOnStart(new Credit()));
    }

    @Test
    void newCashSaleFactoryInitializesPendingWarehouseDeliveryState() {
        Articles article = new Articles(10L);
        article.setSellingPrice(5_000.0);
        article.setPurchasePrice(3_500.0);
        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        line.setQuantity(2);

        LocalDate saleDate = LocalDate.of(2026, 6, 15);
        Credit sale = Credit.newCashSale(sampleClient(), "COM002", "AG001", Set.of(line), saleDate);

        assertTrue(sale.isCash());
        assertEquals(OperationType.CASH, sale.getType());
        assertEquals(CreditStatus.VALIDATED, sale.getStatus());
        assertTrue(sale.awaitingWarehouseDelivery());
        assertEquals(10_000.0, sale.getTotalAmount());
        assertEquals(10_000.0, sale.getTotalAmountPaid());
        assertEquals(0.0, sale.getTotalAmountRemaining());
        assertEquals(0.0, sale.getAdvance());
        assertEquals(0, sale.getRemainingDaysCount());
        assertEquals(saleDate, sale.getBeginDate());
        assertEquals(saleDate, sale.getExpectedEndDate());
        assertNull(sale.getEffectiveEndDate());
        assertEquals("COM002", sale.getCollector());
        assertEquals("AG001", sale.getAgencyCommercial());
        assertSame(sale, line.getCredit());
    }

    @Test
    void initializeFinancialTermsMarksCashSaleFullyPaidWithZeroRemaining() {
        Credit sale = new Credit();
        sale.setType(OperationType.CASH);
        sale.setStatus(CreditStatus.CREATED);
        sale.setTotalAmount(8_000.0);
        sale.setAdvance(1_500.0);
        LocalDate beginDate = LocalDate.of(2026, 6, 1);
        sale.setBeginDate(beginDate);

        sale.checkAdvance();

        assertEquals(8_000.0, sale.getTotalAmountPaid());
        assertEquals(0.0, sale.getTotalAmountRemaining());
        assertEquals(0.0, sale.getAdvance());
        assertEquals(0, sale.getRemainingDaysCount());
        assertEquals(beginDate, sale.getExpectedEndDate());
    }

    @Test
    void rejectsStartDailyStakeChangeAndSoftDelete() {
        Credit sale = new Credit();
        sale.setType(OperationType.CASH);
        sale.setStatus(CreditStatus.VALIDATED);

        assertThrows(CustomValidationException.class, sale::start);
        assertThrows(CustomValidationException.class, () -> policy.assertDailyStakeChangeAllowed(sale));
        assertThrows(CustomValidationException.class, () -> policy.assertSoftDeleteAllowed(sale));
        assertDoesNotThrow(sale::checkInProgressStatus);
    }

    @Test
    void resolveFallbackUnitPriceFallsBackToSellingPriceWhenCreditSalePriceMissing() {
        Articles article = new Articles(2L);
        article.setCreditSalePrice(0.0);
        article.setSellingPrice(2_400.0);
        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        assertEquals(2_400.0, policy.resolveFallbackUnitPrice(line));

        article.setCreditSalePrice(2_800.0);
        assertEquals(2_800.0, policy.resolveFallbackUnitPrice(line));

        article.setCreditSalePrice(0.0);
        article.setSellingPrice(0.0);
        assertEquals(0.0, policy.resolveFallbackUnitPrice(line));
        assertEquals(0.0, policy.resolveFallbackUnitPrice(null));
    }

    private static Client sampleClient() {
        Client client = new Client();
        client.setId(55L);
        client.setClientType(ClientType.CLIENT);
        client.setCollector("COM002");
        return client;
    }
}
