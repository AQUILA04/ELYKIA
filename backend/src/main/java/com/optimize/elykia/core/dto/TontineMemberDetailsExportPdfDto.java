package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TontineMemberDetailsExportPdfDto {
    private String title;
    private String clientCode;
    private String clientName;
    private String commercial;
    private Integer sessionYear;
    private String deliveryStatus;
    private String registrationDate;
    private String generationDate;
    private double dailyStake;
    private double totalContribution;
    private double societyShare;
    private double availableContribution;
    private int validatedMonths;
    private int currentMonthDays;
    private List<TontineCollectionExportRowDto> collections;
    private double collectionsTotal;
    private int collectionsCount;

    @Data
    @Builder
    public static class TontineCollectionExportRowDto {
        private String collectionDate;
        private double amount;
        private double societyShareAmount;
        private String commercialUsername;
        private String reference;
    }
}
