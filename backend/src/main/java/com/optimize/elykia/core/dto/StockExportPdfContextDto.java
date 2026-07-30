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
    /** Présent en export unitaire / multi-sélection : références des demandes/retours ciblés. */
    private String references;
    /** true = export par demande(s) sélectionnée(s), false = export par période. */
    private boolean selectionMode;
    private List<StockRequestExportDTO> items;
    private Long totalQuantity;
    private Double totalAmount;
}
