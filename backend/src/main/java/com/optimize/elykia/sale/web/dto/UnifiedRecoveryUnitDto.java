package com.optimize.elykia.sale.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/**
 * Unité d'un lot de recouvrements unifié ({@link UnifiedRecoveryBatchDto}).
 * Transporte systématiquement le montant explicite encaissé sur le terrain ou en caisse.
 */
@Data
public class UnifiedRecoveryUnitDto {
    @NotNull(message = "L'identifiant du crédit est obligatoire !")
    private Long creditId;

    private Long clientId;

    @NotNull(message = "Le montant du recouvrement est obligatoire !")
    @Positive(message = "Le montant du recouvrement doit être strictement positif !")
    private Double amount;

    @NotBlank(message = "La référence du recouvrement est obligatoire !")
    private String recoveryId;

    private Double reliquatGeneratedAmount = 0.0;
    private Double reliquatUsedAmount = 0.0;
    private String operationConsentCode;
    private Double confirmedAmount;
}
