package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockReceptionsDailyPdfDto {
    private LocalDate receptionDate;
    private Double dayTotalAmount;
    @Builder.Default
    private List<DailyItem> items = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyItem {
        private Long articleId;
        private String articleName;
        private Integer quantity;
    }
}
