package com.optimize.common.entities.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.Date;

public class DateUtils {
    private DateUtils() {
        //Default constructor
    }

    public static String simpleDateFormat(LocalDate localDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
        return localDate.format(formatter);
    }

    public static String currentDateFormat() {
        return simpleDateFormat(LocalDate.now());
    }

    public static String getWeekStartDateFormat() {
        LocalDate date = LocalDate.now();
        LocalDate firstDayOfWeek = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return simpleDateFormat(firstDayOfWeek);
    }

    public static String getWeekEndDateFormat() {
        LocalDate date = LocalDate.now();
        LocalDate firstDayOfWeek = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));
        return simpleDateFormat(firstDayOfWeek);
    }

    public static Date convertToDate(LocalDate localDate) {
        if (localDate == null) {
            return null;
        }
        return Date.from(localDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
    }

    public static LocalDate convertToLocalDate(Date date) {
        if (date == null) {
            return null;
        }
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }
}
