package com.optimize.elykia.core.util;

import com.optimize.elykia.core.enumaration.PeriodState;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportPeriod {
    private LocalDate dateFrom;
    private LocalDate dateTo;

    public static ReportPeriod from(PeriodState periodState) {
        LocalDate currentDate = LocalDate.now();
        if(PeriodState.CE_JOUR.equals(periodState)) {
            return new ReportPeriod(currentDate, currentDate);
        } else if (PeriodState.CETTE_SEMAINE.equals(periodState)) {
            return new ReportPeriod(DateUtils.getCurrentWeekFirstDate(currentDate), DateUtils.getCurrentWeekLastDate(currentDate));
        } else if (PeriodState.CE_MOIS.equals(periodState)) {
            return new ReportPeriod(currentDate.withDayOfMonth(1), currentDate.withDayOfMonth(currentDate.lengthOfMonth()));
        } else if (PeriodState.HIER.equals(periodState)) {
            LocalDate date = currentDate.minusDays(1);
            return new ReportPeriod(date, date);
        } else if (PeriodState.SEMAINE_PRECEDENTE.equals(periodState)) {
            LocalDate date = DateUtils.getLastWeekFirstDate(currentDate);
            return new ReportPeriod(date, DateUtils.getCurrentWeekLastDate(date));
        } else if (PeriodState.MOIS_PRECEDENT.equals(periodState)) {
            LocalDate lastMonth = currentDate.minusMonths(1).withDayOfMonth(1);
            return new ReportPeriod(lastMonth, lastMonth.withDayOfMonth(lastMonth.lengthOfMonth()));
        } else if (PeriodState.TROIS_DERNIER_MOIS.equals(periodState)) {
            LocalDate threeLastMonth = currentDate.minusMonths(3).withDayOfMonth(1);
            return new ReportPeriod(threeLastMonth, currentDate);
        } else if (PeriodState.SIX_DERNIER_MOIS.equals(periodState)) {
            LocalDate sixLastMonth = currentDate.minusMonths(6).withDayOfMonth(1);
            return new ReportPeriod(sixLastMonth, currentDate);
        } else if (PeriodState.CETTE_ANNEE.equals(periodState)) {
            LocalDate januaryFirst = currentDate.withDayOfYear(1);
            return new ReportPeriod(januaryFirst, currentDate);
        } else if (PeriodState.ANNEE_PRECEDENTE.equals(periodState)) {
            LocalDate januaryFirst = currentDate.withDayOfYear(1);
            LocalDate lastYear = januaryFirst.minusYears(1);
            return new ReportPeriod(lastYear, lastYear.with(TemporalAdjusters.lastDayOfYear()));
        }
        else {
            throw new UnsupportedOperationException("Période spécifiée inconnue !");
        }
    }
}
