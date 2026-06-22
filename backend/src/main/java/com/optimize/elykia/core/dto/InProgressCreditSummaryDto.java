package com.optimize.elykia.core.dto;

public record InProgressCreditSummaryDto(
        long count,
        double totalAmount,
        double totalMargin,
        double totalAmountRemaining
) {
    public static InProgressCreditSummaryDto empty() {
        return new InProgressCreditSummaryDto(0L, 0.0, 0.0, 0.0);
    }
}
