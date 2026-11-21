package com.optimize.elykia.sale.web.dto;

public record SalesTypeSummaryDto(
        long count,
        double totalAmount,
        double totalMargin
) {
    public static SalesTypeSummaryDto empty() {
        return new SalesTypeSummaryDto(0L, 0.0, 0.0);
    }
}
