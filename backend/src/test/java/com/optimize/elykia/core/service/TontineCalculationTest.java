package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.TontineMember;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;
import java.lang.reflect.Method;

public class TontineCalculationTest {

    @Test
    public void testCalculateMemberStatus() throws Exception {
        // Setup
        TontineMember member = new TontineMember();
        member.setAmount(1000.0);
        member.setTotalContribution(0.0);

        // Access private method using reflection
        TontineService service = new TontineService(null,
                null,
                null,
                null,
                null,
                null,
                null);
        Method calculateMethod = TontineService.class.getDeclaredMethod("calculateMemberStatus", TontineMember.class);
        calculateMethod.setAccessible(true);

        // Case 1: Partial Month (10 days)
        // 10 days * 1000 = 10,000
        member.setTotalContribution(10000.0);
        calculateMethod.invoke(service, member);
        Assertions.assertEquals(0, member.getSocietyShare(), "Society share should be 0 for < 31 days");
        Assertions.assertEquals(0, member.getValidatedMonths(), "Validated months should be 0");
        Assertions.assertEquals(10, member.getCurrentMonthDays(), "Current month days should be 10");
        Assertions.assertEquals(10000.0, member.getAvailableContribution(), "Available should be 10000");

        // Case 2: Full Month (31 days)
        // 31 days * 1000 = 31,000
        member.setTotalContribution(31000.0);
        calculateMethod.invoke(service, member);
        Assertions.assertEquals(1000.0, member.getSocietyShare(), "Society share should be 1000 (1 day)");
        Assertions.assertEquals(1, member.getValidatedMonths(), "Validated months should be 1");
        Assertions.assertEquals(0, member.getCurrentMonthDays(), "Current month days should be 0");
        Assertions.assertEquals(30000.0, member.getAvailableContribution(), "Available should be 30000 (30 days)");

        // Case 3: Multiple Months (35 days)
        // 35 * 1000 = 35,000
        member.setTotalContribution(35000.0);
        calculateMethod.invoke(service, member);
        Assertions.assertEquals(1000.0, member.getSocietyShare(), "Society share should be 1000 (1 month)");
        Assertions.assertEquals(1, member.getValidatedMonths(), "Validated months should be 1");
        Assertions.assertEquals(4, member.getCurrentMonthDays(), "Remainder days should be 4");
        Assertions.assertEquals(34000.0, member.getAvailableContribution(), "Available should be 34000 (35000 - 1000)");

        // Case 4: 2 Months exact (62 days)
        member.setTotalContribution(62000.0);
        calculateMethod.invoke(service, member);
        Assertions.assertEquals(2000.0, member.getSocietyShare(), "Society share should be 2000 (2 months)");
        Assertions.assertEquals(2, member.getValidatedMonths(), "Validated months should be 2");
        Assertions.assertEquals(60000.0, member.getAvailableContribution(), "Available");

        // Case 5: Completed Session (10 months + excess)
        // 10 months = 310 days = 310,000
        // Excess = 10,000 extra -> Total 320,000
        member.setTotalContribution(320000.0);
        calculateMethod.invoke(service, member);
        Assertions.assertEquals(10000.0, member.getSocietyShare(), "Society share capped at 10 months (10*1000)");
        Assertions.assertEquals(10, member.getValidatedMonths(), "Validated months capped at 10");
        Assertions.assertEquals(0, member.getCurrentMonthDays(), "Remainder days ignored after 10 months");
        Assertions.assertEquals(310000.0, member.getAvailableContribution(), "Available = Total - 10000"); // 320000 -
                                                                                                           // 10000
    }
}
