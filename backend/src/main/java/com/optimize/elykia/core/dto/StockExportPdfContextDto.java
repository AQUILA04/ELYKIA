package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockExportPdfContextDto {
    private String title;
    private String startDate;
    private String endDate;
    private String collector;
    private String generationDate;
    private List<StockRequestExportDTO> items;
    private Long totalQuantity;
}
