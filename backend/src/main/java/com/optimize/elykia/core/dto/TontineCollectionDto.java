package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class TontineCollectionDto {
    @NotNull(message = "L'ID du membre ne peut pas être nul.")
    private Long memberId;

    @NotNull(message = "Le montant ne peut pas être nul.")
    @Positive(message = "Le montant doit être positif.")
    private Double amount;
    private Boolean isDeliveryCollection = Boolean.FALSE;
    private String reference;
    private State state =State.ENABLED;

}
