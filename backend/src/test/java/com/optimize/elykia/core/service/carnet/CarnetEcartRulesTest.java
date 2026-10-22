package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.exception.CustomValidationException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CarnetEcartRulesTest {

    @Test
    void creditSplit_capsImputedAtRemainingAndKeepsFullCashAsShortage() {
        CarnetEcartRules.CreditSplit split = CarnetEcartRules.creditSplit(1500d, 400d);

        assertEquals(400d, split.imputedOnCredit());
        assertEquals(1100d, split.reliquat());
        assertEquals(1500d, split.cash());
    }

    @Test
    void creditSplit_settledCreditBecomesReliquatOnly() {
        CarnetEcartRules.CreditSplit split = CarnetEcartRules.creditSplit(800d, 0d);

        assertEquals(0d, split.imputedOnCredit());
        assertEquals(800d, split.reliquat());
        assertEquals(800d, split.cash());
    }

    @Test
    void creditSplit_inverseDoesNotCreateAMise() {
        CarnetEcartRules.CreditSplit split = CarnetEcartRules.creditSplit(-200d, 500d);

        assertEquals(0d, split.cash());
        assertTrue(CarnetEcartRules.isNegative(-200d));
    }

    @Test
    void tontineOperationDate_currentMonthIsTodayAndPastMonthIsMonthEnd() {
        LocalDate today = LocalDate.of(2026, 10, 22);

        assertEquals(today, CarnetEcartRules.tontineOperationDate(2026, 10, today));
        assertEquals(LocalDate.of(2026, 3, 31), CarnetEcartRules.tontineOperationDate(2026, 3, today));
    }

    @Test
    void tontineOperationDate_rejectsAFutureMonth() {
        assertThrows(CustomValidationException.class,
                () -> CarnetEcartRules.tontineOperationDate(2026, 11, LocalDate.of(2026, 10, 22)));
    }

    @Test
    void constitutionGap_removesOpenFieldControlShortageOnce() {
        assertEquals(100d, CarnetEcartRules.constitutionGap(130d, 0d, 30d));
        assertEquals(0d, CarnetEcartRules.constitutionGap(30d, 0d, 30d));
        assertEquals(0d, CarnetEcartRules.constitutionGap(30d, 30d, 0d));
    }
}
