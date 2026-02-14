package com.optimize.elykia.core.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO pour les CreditTimeline à destination de l'application mobile
 * Mappé vers le modèle Recovery côté mobile
 */
@Data
public class CreditTimelineMobileDto {
    private String id; // ID du CreditTimeline converti en String
    private Double amount;
    private LocalDateTime paymentDate; // createdDate du CreditTimeline
    private LocalDateTime createdAt; // createdDate du CreditTimeline
    private Boolean isDefaultStake; // normalStake
    private String commercialId; // collector
    private String distributionId; // credit.id converti en String
    private String clientId; // credit.client.id converti en String
    private String reference; // reference du CreditTimeline (ID mobile si existe)
    private Boolean isSync; // Toujours true car vient du serveur
    private LocalDateTime syncDate; // Date de récupération
}
