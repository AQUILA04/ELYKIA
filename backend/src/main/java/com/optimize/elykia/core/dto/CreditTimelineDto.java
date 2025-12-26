package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreditTimelineDto {
    private Long id;
    @NotNull(message = "L'identifiant du credit est obligatoire !")
    private Long creditId;
    @NotNull(message = "Le montant de la mise journalière est obligatoire !")
    private Double amount;
    @NotNull(message = "Le type de mise journalière est obligatoire !")
    private Boolean normalStake;

    //private Integer remainingDaysCount;
    //private Double totalAmountRemaining;
    private String collector;
}
