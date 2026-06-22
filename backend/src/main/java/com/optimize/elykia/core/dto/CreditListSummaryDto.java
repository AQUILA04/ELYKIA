package com.optimize.elykia.core.dto;

import java.time.LocalDate;

public record CreditListSummaryDto(
        LocalDate startDate,
        LocalDate endDate,
        SalesTypeSummaryDto closedTotal,
        SalesTypeSummaryDto closedCredit,
        SalesTypeSummaryDto closedCash,
        SalesTypeSummaryDto closedTontine,
        InProgressCreditSummaryDto inProgressCredit,
        long collectedCount,
        double collectedAmount
) {
}
