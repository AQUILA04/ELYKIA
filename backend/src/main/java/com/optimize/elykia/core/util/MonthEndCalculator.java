package com.optimize.elykia.core.util;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

public class MonthEndCalculator {

    public static long getDaysUntilMonthEnd(LocalDate date) {
        YearMonth yearMonth = YearMonth.from(date);
        LocalDate endOfMonth = yearMonth.atEndOfMonth();
        return ChronoUnit.DAYS.between(date, endOfMonth);
    }

    public static long getDaysUntilMonthEnd() {
        return getDaysUntilMonthEnd(LocalDate.now());
    }

    public static boolean isInLastFiveDaysOfMonth(LocalDate date) {
        long daysUntilMonthEnd = getDaysUntilMonthEnd(date);
        return daysUntilMonthEnd >= 0 && daysUntilMonthEnd <= 5;
    }

    public static boolean isInLastFiveDaysOfMonth() {
        return isInLastFiveDaysOfMonth(LocalDate.now());
    }

    public static NextMonthDate getNextMonthDate(LocalDate date) {
        LocalDate nextMonth = date.plusMonths(1);
        return new NextMonthDate(nextMonth.getMonthValue(), nextMonth.getYear());
    }

    public static NextMonthDate getNextMonthDate() {
        return getNextMonthDate(LocalDate.now());
    }

    public record NextMonthDate(int month, int year) {
    }
}
