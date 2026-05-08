package com.optimize.elykia.core.dto.stock;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class StockReturnDto {
    @NotBlank
    private String commercial; // username du commercial

    @NotNull
    private Long targetStockId; // ID du CommercialMonthlyStock cible

    @NotNull
    private LocalDate returnDate;

    private String note;

    @NotEmpty
    @Valid
    private List<StockReturnItemDto> items;

    @Data
    public static class StockReturnItemDto {
        @NotNull
        private Long stockItemId; // ID du CommercialMonthlyStockItem

        @NotNull
        private Long articleId;

        @NotNull
        @Positive
        private Integer quantity;

        @NotNull
        @Positive
        private Double unitPrice;
    }
}
