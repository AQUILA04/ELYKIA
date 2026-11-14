package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CashSaleWarehouseDeliveryTest {

    @Test
    void availableQuantityIgnoresStockAlreadyPromisedToACashSale() {
        Articles article = new Articles(1L);
        article.setStockQuantity(1);
        article.addReservation(1);

        assertEquals(0, article.availableQuantity());

        article.setStockQuantity(5);
        article.releaseReservation(1);
        assertEquals(5, article.availableQuantity());
    }

    @Test
    void recoveryDoesNotCloseACashSaleWaitingForDelivery() {
        Credit sale = cashSale();
        CreditTimeline timeline = new CreditTimeline();
        timeline.setAmount(1_000.0);
        timeline.setNormalStake(false);

        sale.dailyStakeOperation(timeline);

        assertEquals(CreditStatus.VALIDATED, sale.getStatus());
        assertNull(sale.getEffectiveEndDate());
        assertTrue(sale.isPendingWarehouseDelivery());
    }

    @Test
    void deliveryClosesTheCashSale() {
        Credit sale = cashSale();
        sale.setExpectedEndDate(LocalDate.now());

        sale.settleAfterWarehouseDelivery();

        assertEquals(CreditStatus.SETTLED, sale.getStatus());
        assertEquals(LocalDate.now(), sale.getEffectiveEndDate());
        assertEquals(false, sale.isPendingWarehouseDelivery());
    }

    private static Credit cashSale() {
        Credit sale = new Credit();
        sale.setType(OperationType.CASH);
        sale.setStatus(CreditStatus.VALIDATED);
        sale.setPendingWarehouseDelivery(true);
        sale.setTotalAmount(1_000.0);
        sale.setTotalAmountPaid(1_000.0);
        sale.setTotalAmountRemaining(0.0);
        sale.setDailyStake(1_000.0);
        sale.setRemainingDaysCount(0);
        return sale;
    }
}
