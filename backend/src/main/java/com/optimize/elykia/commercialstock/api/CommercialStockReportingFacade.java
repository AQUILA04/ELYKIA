package com.optimize.elykia.commercialstock.api;

import java.time.LocalDate;
import java.util.List;

/** Rapports périodiques (plage libre, mois, session) et génération des arrêtés mensuels. */
public interface CommercialStockReportingFacade {

    List<CommercialStockPeriodRowView> periodReport(LocalDate startDate, LocalDate endDate, String collector,
                                                    StockActivityType activityType);

    List<CommercialStockTeamRowView> teamOverview(LocalDate startDate, LocalDate endDate, String collector,
                                                  StockActivityType activityType);

    /** Calcule ou recalcule les snapshots mensuels pour (year, month). Renvoie le nombre de lignes écrites. */
    int computeMonthlySnapshots(int year, int month);
}
