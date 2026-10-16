package com.optimize.elykia.core.service.customer;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CustomerAutomaticPaymentServiceTest {

    @Test
    void normalizesLocalTogoleseNumber() {
        assertEquals("22890123456", CustomerAutomaticPaymentService.normalizePhone("90 12 34 56"));
        assertEquals("22890123456", CustomerAutomaticPaymentService.normalizePhone("+228 90 12 34 56"));
    }

    @Test
    void roundsInstallmentToFranc() {
        assertEquals(10_000L, CustomerAutomaticPaymentService.toFrancs(10_000.4));
    }

    @Test
    void rejectsShortPhone() {
        assertThrows(RuntimeException.class, () -> CustomerAutomaticPaymentService.normalizePhone("123"));
    }
}
