package com.optimize.elykia.tontine.web.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TontineOrderReceiptVerificationDto {
    private boolean found;
    private String message;
    private String authenticityCode;
    private String reference;
    private String clientName;
    private String clientPhone;
    private String commercialUsername;
    private String requestDate;
    private String statusLabel;
    private String totalAmount;
    private List<TontineOrderReceiptPdfDto.Line> lines;
}
