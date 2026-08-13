package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RemainingAtClientsExportPdfDto {
    private String commercialLabel;
    private String commercialUsername;
    private int year;
    private String generationDate;
    private long salesCount;
    private double totalRemainingAmount;
    private List<Row> rows;

    @Data
    @Builder
    public static class Row {
        private int index;
        private String clientLastname;
        private String clientFirstname;
        private String reference;
        private String beginDate;
        private String totalAmount;
        private String totalAmountRemaining;
    }
}
