package com.optimize.elykia.core.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour les CreditTimeline à destination de l'application mobile
 * Mappé vers le modèle Recovery côté mobile
 */
@Data
@NoArgsConstructor
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

    public CreditTimelineMobileDto(Long id, Double amount, LocalDateTime createdDate, Boolean normalStake, String collector, Long creditId, Long clientId, String reference) {
        this.id = id != null ? id.toString() : null;
        this.amount = amount;
        this.paymentDate = createdDate;
        this.createdAt = createdDate;
        this.isDefaultStake = normalStake;
        this.commercialId = collector;
        this.distributionId = creditId != null ? creditId.toString() : null;
        this.clientId = clientId != null ? clientId.toString() : null;
        this.reference = reference;
        this.isSync = true;
        this.syncDate = LocalDateTime.now();
    }
}
