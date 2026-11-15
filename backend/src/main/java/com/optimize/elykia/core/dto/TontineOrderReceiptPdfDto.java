package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TontineOrderReceiptPdfDto {
    private String reference;
    private String authenticityCode;
    private String orderDate;
    private String statusLabel;
    private String sessionYear;
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
