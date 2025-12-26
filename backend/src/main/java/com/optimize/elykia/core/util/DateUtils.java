package com.optimize.elykia.core.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

public class DateUtils {
    private DateUtils() {
    }

    public static LocalDate getCurrentWeekFirstDate(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    public static LocalDate getCurrentWeekLastDate(LocalDate date) {
        return date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
    }

    public static LocalDate getLastWeekFirstDate(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
    }

    public static LocalDate getStartYearDate() {
        return LocalDate.of(LocalDate.now().getYear(), 1, 1);
    }

    public static LocalDate getEndYearDate() {
        return LocalDate.of(LocalDate.now().getYear(), 12, 31);
    }


}
