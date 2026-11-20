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
}
