package com.optimize.elykia.tontine.web.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TontineOrderReceiptPdfDto {
    private String reference;
    private String authenticityCode;
    private String orderDate;
    /** Date de livraison prévue (vide si aucune). */
    private String plannedDeliveryDate;
    private String statusLabel;
    private String sessionYear;
    private String clientLastname;
    private String clientFirstname;
    private String clientPhone;
    private String clientQuarter;
    private String clientAddress;
    private String commercialLabel;
    private String totalAmount;
    /** Vrai pour une commande remise : libellés « total cotisé / utilisé / restant ». */
    private boolean delivered;
    /** Solde net cotisé (ou total cotisé à la remise). */
    private String netContribution;
    /** Reste à payer, affiché seulement si la commande dépasse le solde. */
    private String amountDue;
    private boolean hasAmountDue;
    /** Reliquat à restituer (ou total restant après remise). */
    private String refundableBalance;
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
