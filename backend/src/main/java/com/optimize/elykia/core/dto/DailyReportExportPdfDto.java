package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DailyReportExportPdfDto {
    private String title;
    private String companyName;
    private String startDate;
    private String endDate;
    private String commercialUsername;
    private String generationDate;

    private int distributionCount;
    private double distributionAmount;
    private int recoveryCount;
    private double recoveryAmount;
    private int newClientCount;
    private double newClientBalance;
    private int tontineMemberCount;
    private int tontineCollectionCount;
    private double tontineCollectionAmount;
    private int tontineDeliveryCount;
    private double tontineDeliveryAmount;
    private double totalAdvancesAmount;
    private double totalReliquatGeneratedAmount;
    private double totalReliquatUsedAmount;
    private double totalToPay;

    private List<ItemRow> distributions;
    private List<ItemRow> recoveries;
    private List<ItemRow> newClients;
    private List<ItemRow> tontineMembers;
    private List<ItemRow> tontineCollections;
    private List<ItemRow> tontineDeliveries;

    @Data
    @Builder
    public static class ItemRow {
        private int index;
        private String time;
        private String clientName;
        private String details;
        private String amount;
        private String extra;
        private String status;
    }
}
