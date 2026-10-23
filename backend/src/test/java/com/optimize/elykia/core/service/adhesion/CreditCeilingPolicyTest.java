package com.optimize.elykia.core.service.adhesion;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.enumaration.AdhesionType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CreditCeilingPolicyTest {

    @Test
    void personalCeilingIsFixedAndIgnoresBalance() {
        assertEquals(35_000d, CreditCeilingPolicy.ceiling(AdhesionType.PERSONAL, 500d, 6, 35_000d));
        assertDoesNotThrow(() -> CreditCeilingPolicy.assertWithinCeiling(
                AdhesionType.PERSONAL, 35_000d, 500d, 6, 35_000d));
        assertThrows(CustomValidationException.class, () -> CreditCeilingPolicy.assertWithinCeiling(
                AdhesionType.PERSONAL, 35_001d, 500_000d, 6, 35_000d));
    }

    @Test
    void businessAndEventCeilingsAreBalanceTimesDividend() {
        assertEquals(12_000d, CreditCeilingPolicy.ceiling(AdhesionType.BUSINESS, 2_000d, 6, 35_000d));
        assertEquals(12_000d, CreditCeilingPolicy.ceiling(AdhesionType.EVENT, 2_000d, 6, 35_000d));
        assertDoesNotThrow(() -> CreditCeilingPolicy.assertWithinCeiling(
                AdhesionType.BUSINESS, 12_000d, 2_000d, 6, 35_000d));
        assertThrows(CustomValidationException.class, () -> CreditCeilingPolicy.assertWithinCeiling(
                AdhesionType.EVENT, 12_001d, 2_000d, 6, 35_000d));
    }

    @Test
    void topUpRaisesBusinessCeiling() {
        assertDoesNotThrow(() -> CreditCeilingPolicy.assertWithinCeiling(
                AdhesionType.BUSINESS, 18_000d, 3_000d, 6, 35_000d));
    }
}
