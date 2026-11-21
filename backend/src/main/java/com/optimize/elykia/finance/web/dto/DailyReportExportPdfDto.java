package com.optimize.elykia.finance.web.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Données du PDF « Rapport commercial » (fiche commercial du nouveau rapport). */
@Data
@Builder
public class DailyReportExportPdfDto {
    private String title;
    private String companyName;
    private String startDate;
    private String endDate;
    private String periodLabel;
    private String commercialUsername;
    private String generationDate;

    /** Situation : libellé et classe de pastille (pill-green, pill-amber…). */
    private String statusLabel;
    private String statusClass;

    // Rapprochement (mêmes règles que le cockpit).
    private double creditToDeposit;
    private double tontineToDeposit;
    private double newBalanceToDeposit;
    private double catchupEntered;
    private double cashDue;
    private double deposited;
    private double surplus;
    private double remaining;
    private double historicalRemaining;
    private long operationsCount;

    // Activité.
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
    private int tontineCatchupCount;
    private double tontineCatchupAmount;
    private double totalToPay;

    /** Détail des opérations, une section par type non vide. */
    private List<Section> sections;

    @Data
    @Builder
    public static class Section {
        private String title;
        private String total;
        private boolean showExtra;
        private List<ItemRow> rows;
    }

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
