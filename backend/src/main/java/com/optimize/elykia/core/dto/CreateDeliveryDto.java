package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateDeliveryDto {

    @NotNull(message = "L'identifiant du membre de la tontine est requis")
    private Long tontineMemberId;
    private String reference;
    /** Code ELY-XXXX-XXXX produit par le téléphone. Absent : le serveur en génère un. */
    private String authenticityCode;
    private LocalDateTime requestDate;
    /** Date de livraison prévue, optionnelle. */
    private LocalDate plannedDeliveryDate;

    @Valid
    @NotEmpty(message = "La liste des articles ne peut pas être vide")
    private List<DeliveryItemDto> items;
    
    private String operationConsentCode;
    private String syncConsentCode;

    /**
     * Part société réelle saisie pendant la commande (facultatif). Appliquée avant le contrôle du plafond,
     * dans la même transaction que la commande.
     */
    @Valid
    private AdjustTontineSocietyShareDto societyShareAdjustment;
}