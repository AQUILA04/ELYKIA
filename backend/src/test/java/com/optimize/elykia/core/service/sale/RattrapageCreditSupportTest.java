package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RattrapageCreditSupportTest {

    @Test
    void defaultsToLastDayOfSourceStockMonthWhenBeginDateIsNull() {
        CommercialMonthlyStock stock = stock(2026, 2);

        LocalDate resolved = RattrapageCreditSupport.resolveBeginDate(null, stock);

        assertEquals(LocalDate.of(2026, 2, 28), resolved);
    }

    @Test
    void acceptsDateInsideSourceStockMonth() {
        CommercialMonthlyStock stock = stock(2026, 2);

        LocalDate resolved = RattrapageCreditSupport.resolveBeginDate(LocalDate.of(2026, 2, 10), stock);

        assertEquals(LocalDate.of(2026, 2, 10), resolved);
    }

    @Test
    void rejectsDateBeforeSourceStockMonth() {
        CommercialMonthlyStock stock = stock(2026, 2);

        assertThrows(CustomValidationException.class,
                () -> RattrapageCreditSupport.resolveBeginDate(LocalDate.of(2026, 1, 31), stock));
    }

    @Test
    void rejectsDateAfterSourceStockMonth() {
        CommercialMonthlyStock stock = stock(2026, 2);

        assertThrows(CustomValidationException.class,
                () -> RattrapageCreditSupport.resolveBeginDate(LocalDate.of(2026, 6, 10), stock));
    }

    private static CommercialMonthlyStock stock(int year, int month) {
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setYear(year);
        stock.setMonth(month);
        return stock;
    }
}
