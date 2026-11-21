package com.optimize.elykia.sale.web.dto;

public record CreditSourceMonthlyStockDto(
        Long id,
        String collector,
        Integer month,
        Integer year) {
}
