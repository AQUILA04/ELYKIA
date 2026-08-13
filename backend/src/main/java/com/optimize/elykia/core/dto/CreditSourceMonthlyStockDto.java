package com.optimize.elykia.core.dto;

public record CreditSourceMonthlyStockDto(
        Long id,
        String collector,
        Integer month,
        Integer year) {
}
