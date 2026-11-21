package com.optimize.elykia.finance.api;

import com.optimize.elykia.finance.web.dto.CommercialYearlySummaryDto;

/**
 * Port SPI permettant à {@code CommercialReportMonthlyService} de déléguer le calcul du bilan annuel
 * portefeuille crédit sans dépendre de {@code core}/{@code sale}.
 */
public interface CommercialYearlyPortfolioPort {

    CommercialYearlySummaryDto buildYearlySummary(String commercialUsername, int year);
}
