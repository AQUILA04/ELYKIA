package com.optimize.elykia.reporting.application;

import com.optimize.elykia.commercialstock.api.CommercialStockReportingFacade;
import com.optimize.elykia.sale.application.CommercialMonthlyStockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommercialMonthlyStockCloseExecutor {

    private final CommercialMonthlyStockService monthlyStockService;
    private final MonthlyReportAggregationService aggregationService;

    @Lazy
    @Autowired
    private CommercialMonthlyStockCloseExecutor self;

    private CommercialStockReportingFacade commercialStockReportingFacade;

    @Autowired(required = false)
    public void setCommercialStockReportingFacade(CommercialStockReportingFacade commercialStockReportingFacade) {
        this.commercialStockReportingFacade = commercialStockReportingFacade;
    }

    /**
     * Clôture les stocks du mois rapporté. Le traitement tourne le 1er du mois suivant :
     * utiliser la date du jour clôturerait le mois qui commence au lieu de celui qui se termine.
     */
    public void closeMonthStocksSafely(int year, int month) {
        try {
            aggregationService.listActiveCommercials(year, month)
                    .forEach(username -> self.closeSafely(username, year, month));
        } catch (Exception exception) {
            log.warn("Impossible de clôturer certains stocks mensuels {}/{}: {}", month, year, exception.getMessage());
        }
        if (commercialStockReportingFacade != null) {
            try {
                commercialStockReportingFacade.computeMonthlySnapshots(year, month);
            } catch (Exception exception) {
                log.warn("Impossible de calculer les arrêtés mensuels continus {}/{}: {}", month, year, exception.getMessage());
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void closeSafely(String collector, int year, int month) {
        try {
            monthlyStockService.closeMonthStock(collector, year, month);
        } catch (Exception ignored) {
            // Stock déjà clôturé ou inexistant pour ce commercial
        }
    }
}
