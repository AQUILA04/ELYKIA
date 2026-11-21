package com.optimize.elykia.tontine.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TontineOrderBalanceTest {

    @Test
    void orderAboveTheNetBalanceLeavesAnAmountToPay() {
        TontineOrderBalance balance = TontineOrderBalance.of(40_000, 55_000, false);

        assertEquals(40_000, balance.netContribution());
        assertEquals(55_000, balance.orderTotal());
        assertEquals(15_000, balance.amountDue());
        assertEquals(0, balance.refundableBalance());
    }

    @Test
    void orderBelowTheNetBalanceLeavesABalanceToRefund() {
        TontineOrderBalance balance = TontineOrderBalance.of(60_000, 45_500, false);

        assertEquals(0, balance.amountDue());
        assertEquals(14_500, balance.refundableBalance());
    }

    @Test
    void exactOrderLeavesNothingToPayOrRefund() {
        TontineOrderBalance balance = TontineOrderBalance.of(30_000.004, 30_000, false);

        assertEquals(0, balance.amountDue());
        assertEquals(0, balance.refundableBalance());
    }

    @Test
    void pendingOrderReadsTheCurrentNetBalanceOfTheMember() {
        TontineDelivery delivery = delivery(TontineMemberDeliveryStatus.PENDING, 50_000.0, 75_000.0, 0.0);

        TontineOrderBalance balance = TontineOrderBalance.of(delivery);

        assertFalse(balance.delivered());
        assertEquals(75_000, balance.netContribution());
        assertEquals(25_000, balance.refundableBalance());
    }

    @Test
    void deliveredOrderKeepsTheAmountsOfTheHandover() {
        // Après la remise, le reliquat est versé sur le compte : le solde net est la commande plus ce reliquat.
        TontineDelivery delivery = delivery(TontineMemberDeliveryStatus.DELIVERED, 50_000.0, 0.0, 8_000.0);

        TontineOrderBalance balance = TontineOrderBalance.of(delivery);

        assertTrue(balance.delivered());
        assertEquals(58_000, balance.netContribution());
        assertEquals(50_000, balance.orderTotal());
        assertEquals(8_000, balance.refundableBalance());
        assertEquals(0, balance.amountDue());
    }

    @Test
    void missingAmountsCountAsZero() {
        TontineDelivery delivery = new TontineDelivery();

        TontineOrderBalance balance = TontineOrderBalance.of(delivery);

        assertEquals(0, balance.netContribution());
        assertEquals(0, balance.orderTotal());
    }

    private static TontineDelivery delivery(TontineMemberDeliveryStatus status, double total,
                                            double available, double remaining) {
        TontineMember member = new TontineMember();
        member.setDeliveryStatus(status);
        member.setAvailableContribution(available);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setTontineMember(member);
        delivery.setTotalAmount(total);
        delivery.setRemainingBalance(remaining);
        return delivery;
    }
}
