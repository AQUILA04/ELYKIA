package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** PDF des membres à livrer pour une date prévue (commandes non encore remises). */
@Data
@Builder
public class TontinePlannedDeliveriesPdfDto {
    private String plannedDate;
    private String commercialLabel;
    /** Vrai si aucun commercial n'est filtré : la colonne commercial s'affiche sous le membre. */
    private boolean allCommercials;
    private String generationDate;
    private int memberCount;
    private String totalAmount;
    private String totalAmountDue;
    private List<Row> rows;

    @Data
    @Builder
    public static class Row {
        private int index;
        private String clientName;
        private String clientContact;
        private String commercial;
        private String reference;
        private String statusLabel;
        private boolean validated;
        /** Une ligne par article : « 2 × Riz 25 kg ». */
        private List<String> items;
        private String totalAmount;
        private String netContribution;
        private String amountDue;
        private boolean hasAmountDue;
    }
}
