package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TontineCollectionDto {
    @NotNull(message = "L'ID du membre ne peut pas être nul.")
    private Long memberId;

    @NotNull(message = "Le montant ne peut pas être nul.")
    @Positive(message = "Le montant doit être positif.")
    private Double amount;
    private Boolean isDeliveryCollection = Boolean.FALSE;
    private String reference;
    private String notes;
    private String operationConsentCode;
    private Double confirmedAmount;
    private String syncConsentCode;
    @Positive(message = "La mise de rattrapage doit être positive.")
    private Double catchupDailyStake;

    /**
     * Date métier de la collecte (rattrapage). Si absent, la collecte est enregistrée à la date du jour.
     */
    private LocalDate collectionDate;

    /**
     * V2 uniquement : indique que le surplus doit ouvrir le mois suivant une fois 31 jours atteints.
     */
    private Boolean advanceToNextMonth = Boolean.FALSE;
}
