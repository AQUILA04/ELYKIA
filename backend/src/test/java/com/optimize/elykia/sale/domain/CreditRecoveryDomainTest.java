package com.optimize.elykia.sale.domain;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.finance.domain.DailyAccountancy;
import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests unitaires du domaine riche pour le recouvrement unifié :
 * {@link RecoveryPayment}, {@link RecoverySource}, {@link Credit#applyRecovery} et {@link Credit#reverseRecovery}.
 */
class CreditRecoveryDomainTest {

    @Test
    void recoveryPayment_rejectsNonPositiveOrNonFiniteAmount() {
        assertThrows(CustomValidationException.class, () ->
                new RecoveryPayment(0.0, 0.0, 0.0, "REF-1", "COM001", null, null, null, RecoverySource.WEB_SINGLE));
        assertThrows(CustomValidationException.class, () ->
                new RecoveryPayment(-50.0, 0.0, 0.0, "REF-1", "COM001", null, null, null, RecoverySource.WEB_SINGLE));
        assertThrows(CustomValidationException.class, () ->
                new RecoveryPayment(Double.NaN, 0.0, 0.0, "REF-1", "COM001", null, null, null, RecoverySource.WEB_SINGLE));
        assertThrows(CustomValidationException.class, () ->
                new RecoveryPayment(100.0, -1.0, 0.0, "REF-1", "COM001", null, null, null, RecoverySource.WEB_SINGLE));
        assertThrows(CustomValidationException.class, () ->
                new RecoveryPayment(100.0, 0.0, -1.0, "REF-1", "COM001", null, null, null, RecoverySource.WEB_SINGLE));
    }

    @Test
    void applyRecovery_standardStake_updatesRemainingDaysDeterministicallyAndDerivesNormalStakeTrue() {
        Credit credit = creditInProgress(1000.0, 100.0, 10);
        DailyAccountancy accountancy = new DailyAccountancy();

        RecoveryPayment payment = new RecoveryPayment(
                100.0, 0.0, 0.0, "REC-STD-1", "COM001", "CONSENT-1", 100.0, "SYNC-1", RecoverySource.MOBILE_SYNC);

        CreditTimeline timeline = credit.applyRecovery(payment, accountancy);

        assertEquals(100.0, credit.getTotalAmountPaid());
        assertEquals(900.0, credit.getTotalAmountRemaining());
        assertEquals(9, credit.getRemainingDaysCount());
        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
        assertTrue(credit.getDailyPaid());

        assertEquals(credit, timeline.getCredit());
        assertEquals(100.0, timeline.getAmount());
        assertEquals(Boolean.TRUE, timeline.getNormalStake());
        assertEquals(9, timeline.getRemainingDaysCount());
        assertEquals(900.0, timeline.getTotalAmountRemaining());
        assertEquals("REC-STD-1", timeline.getReference());
        assertEquals("COM001", timeline.getCommercialUsername());
        assertEquals(accountancy, timeline.getDailyAccountancy());
    }

    @Test
    void applyRecovery_partialNonMultipleAmount_computesCeilRemainingDaysAndDerivesNormalStakeFalse() {
        Credit credit = creditInProgress(1000.0, 100.0, 10);
        // Paiement partiel de 250 sur un crédit de 1000 (mise 100) -> restant 750 -> ceil(750 / 100) = 8 jours
        RecoveryPayment payment = new RecoveryPayment(
                250.0, 0.0, 0.0, "REC-PART-1", "COM001", null, null, null, RecoverySource.WEB_SINGLE);

        CreditTimeline timeline = credit.applyRecovery(payment, new DailyAccountancy());

        assertEquals(250.0, credit.getTotalAmountPaid());
        assertEquals(750.0, credit.getTotalAmountRemaining());
        assertEquals(8, credit.getRemainingDaysCount());
        assertEquals(Boolean.FALSE, timeline.getNormalStake());
        assertEquals(8, timeline.getRemainingDaysCount());
        assertEquals(750.0, timeline.getTotalAmountRemaining());
    }

    @Test
    void applyRecovery_exactSettlement_closesCreditSetsSolvencyAndUpdatesClientFlag() {
        Credit credit = creditInProgress(500.0, 100.0, 5);
        credit.setExpectedEndDate(LocalDate.now().plusDays(3));
        credit.getClient().setCreditInProgress(true);

        RecoveryPayment payment = new RecoveryPayment(
                500.0, 0.0, 0.0, null, null, null, null, null, RecoverySource.WEB_SINGLE);

        CreditTimeline timeline = credit.applyRecovery(payment, new DailyAccountancy());

        assertEquals(500.0, credit.getTotalAmountPaid());
        assertEquals(0.0, credit.getTotalAmountRemaining());
        assertEquals(0, credit.getRemainingDaysCount());
        assertEquals(CreditStatus.SETTLED, credit.getStatus());
        assertEquals(SolvencyStatus.EARLY, credit.getSolvencyNote());
        assertEquals(LocalDate.now(), credit.getEffectiveEndDate());
        assertFalse(credit.getClient().getCreditInProgress());
        assertNotNull(timeline.getReference());
        assertTrue(timeline.getReference().startsWith("REC-"));
        assertEquals("COM001", timeline.getCommercialUsername());
    }

    @Test
    void applyRecovery_exceedingRemainingAmount_throwsValidationException() {
        Credit credit = creditInProgress(1000.0, 100.0, 10);
        credit.setTotalAmountPaid(800.0);
        credit.setTotalAmountRemaining(200.0);

        RecoveryPayment payment = new RecoveryPayment(
                250.0, 0.0, 0.0, "REC-OVER", "COM001", null, null, null, RecoverySource.MOBILE_SYNC);

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> credit.applyRecovery(payment, new DailyAccountancy()));
        assertTrue(ex.getMessage().contains("CR-TEST-1"));
        assertEquals(800.0, credit.getTotalAmountPaid());
        assertEquals(200.0, credit.getTotalAmountRemaining());
    }

    @Test
    void reverseRecovery_reopensSettledCreditAndRecalculatesRemainingDaysSymmetrically() {
        Credit credit = creditInProgress(500.0, 100.0, 5);
        credit.setExpectedEndDate(LocalDate.now().plusDays(2));

        // 1. Clôture via 250 puis 250
        credit.applyRecovery(new RecoveryPayment(250.0, 0.0, 0.0, "R1", "COM001", null, null, null, RecoverySource.WEB_SINGLE), null);
        assertEquals(3, credit.getRemainingDaysCount()); // ceil(250 / 100) = 3

        credit.applyRecovery(new RecoveryPayment(250.0, 0.0, 0.0, "R2", "COM001", null, null, null, RecoverySource.WEB_SINGLE), null);
        assertEquals(CreditStatus.SETTLED, credit.getStatus());
        assertEquals(0, credit.getRemainingDaysCount());

        // 2. Annulation du second paiement de 250 -> retour exact à l'état précédent
        boolean reopened = credit.reverseRecovery(250.0);

        assertTrue(reopened);
        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
        assertNull(credit.getEffectiveEndDate());
        assertEquals(SolvencyStatus.ND, credit.getSolvencyNote());
        assertEquals(0, credit.getLateDaysCount());
        assertEquals(250.0, credit.getTotalAmountPaid());
        assertEquals(250.0, credit.getTotalAmountRemaining());
        assertEquals(3, credit.getRemainingDaysCount());
        assertTrue(credit.getClient().getCreditInProgress());
        assertFalse(credit.getDailyPaid());
    }

    private static Credit creditInProgress(double totalAmount, double dailyStake, int remainingDays) {
        Credit credit = new Credit();
        credit.setId(1L);
        credit.setReference("CR-TEST-1");
        credit.setType(OperationType.CREDIT);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setCommercialUsername("COM001");
        credit.setTotalAmount(totalAmount);
        credit.setTotalAmountPaid(0.0);
        credit.setTotalAmountRemaining(totalAmount);
        credit.setDailyStake(dailyStake);
        credit.setRemainingDaysCount(remainingDays);
        credit.setBeginDate(LocalDate.now().minusDays(5));
        credit.setExpectedEndDate(LocalDate.now().plusDays(25));
        Client client = new Client();
        client.setId(10L);
        client.setFirstname("Afi");
        client.setLastname("Mensah");
        client.setCreditInProgress(true);
        credit.setClient(client);
        return credit;
    }
}
