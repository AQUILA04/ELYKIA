package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OrderSheetPdfDto {
    private String reference;
    private String orderDate;
    private String statusLabel;
    private String sourceLabel;
    private String clientLastname;
    private String clientFirstname;
    private String clientPhone;
    private String clientQuarter;
    private String clientAddress;
    private String commercialLabel;
    private String totalAmount;
    private List<Line> lines;

    @Data
    @Builder
    public static class Line {
        private int index;
        private String designation;
        private String quantity;
        private String unitPrice;
        private String lineAmount;
    }
}
