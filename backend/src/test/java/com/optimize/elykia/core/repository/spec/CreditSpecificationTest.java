package com.optimize.elykia.core.repository.spec;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreditSpecificationTest {

    @Test
    void doesNotTreatRattrapageReferenceAsDateRange() {
        assertFalse(CreditSpecification.isDateRangeKeyword("RAT-YVG7ZNJ3"));
    }

    @Test
    void treatsValidDateRangeAsDateRange() {
        assertTrue(CreditSpecification.isDateRangeKeyword("01/06/2026-30/06/2026"));
    }
}
