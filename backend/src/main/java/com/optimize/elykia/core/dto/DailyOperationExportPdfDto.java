package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Données du PDF « Journal des opérations ». */
@Data
@Builder
public class DailyOperationExportPdfDto {
    private String title;
    private String startDate;
    private String endDate;
    private String periodLabel;
    private String collector;
    private String typeLabel;
    private String generationDate;
    private int operationsCount;
    private Double totalAmount;
    /** Totaux par type, le plus gros montant d'abord. */
    private List<TypeTotal> totals;
    private List<Row> rows;

    @Data
    @Builder
    public static class TypeTotal {
        private String label;
        private String pill;
        private long count;
        private double amount;
    }

    @Data
    @Builder
    public static class Row {
        private String time;
        private String commercial;
        private String typeLabel;
        private String pill;
        private String reference;
        private String description;
        private double amount;
    }
}
