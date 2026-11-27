package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TontineDeliveryDto {
    
    private Long id;
    private Long tontineMemberId;
    private String reference;
    private String authenticityCode;
    private String clientName;
    private LocalDateTime deliveryDate;
    private LocalDateTime requestDate;
    /** Date de livraison prévue, optionnelle. */
    private java.time.LocalDate plannedDeliveryDate;
    private Double totalAmount;
    private Double remainingBalance;
    private Double projectedBalance;
    private Double availableAtOrder;
    private String commercialUsername;
    private TontineMemberDeliveryStatus deliveryStatus;
    private List<TontineDeliveryItemDto> items;
    private String operationConsentCode;
    private String syncConsentCode;
    /** Vrai quand cette saisie a été ajoutée à la commande déjà enregistrée pour le membre (autre téléphone). */
    private Boolean mergedIntoExisting;
    /** Solde net cotisé par le membre (à la remise pour une commande livrée). */
    private Double netContribution;
    /** Reste à payer quand la commande dépasse le solde net, sinon 0. */
    private Double amountDue;
    /** Reliquat à restituer quand la commande est inférieure au solde net, sinon 0. */
    private Double refundableBalance;
    /** Résultat de la part société saisie avec la commande (validée, corrigée ou refusée), sinon null. */
    private TontineSocietyShareAdjustmentDto societyShareAdjustment;
}
