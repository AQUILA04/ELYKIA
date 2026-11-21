package com.optimize.elykia.finance.web.dto;

import com.optimize.elykia.finance.domain.DailyCommercialReport;

import java.time.LocalDate;
import java.util.List;

/**
 * Fiche d'un commercial sur une période.
 *
 * @param startDate début de la période
 * @param endDate   fin de la période
 * @param line      rapprochement de la période
 * @param activity  activité agrégée de la période (null si aucune opération)
 * @param series    les 7 derniers jours jusqu'à la fin de la période, du plus ancien au plus récent
 */
public record CommercialReportSummaryDto(
        LocalDate startDate,
        LocalDate endDate,
        CommercialReconciliationLineDto line,
        DailyCommercialReport activity,
        List<DailyPoint> series) {

    /**
     * @param date            jour
     * @param amountToDeposit A Verser du jour
     * @param deposited       versé porté sur le jour
     */
    public record DailyPoint(LocalDate date, double amountToDeposit, double deposited) {
    }
}
