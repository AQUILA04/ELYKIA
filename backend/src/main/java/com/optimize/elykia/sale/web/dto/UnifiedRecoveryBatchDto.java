package com.optimize.elykia.sale.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * Payload REST unifié pour l'enregistrement par lot des recouvrements
 * ({@code POST /api/v1/credits/recoveries/batch}), utilisé par la synchronisation Mobile
 * et le TFJ Caisse Web.
 */
@Data
public class UnifiedRecoveryBatchDto {
    @NotBlank(message = "Le nom du collecteur est obligatoire !")
    private String collector;

    private String syncConsentCode;

    /** Source métier optionnelle : {@code MOBILE_SYNC} ou {@code WEB_TFJ_BATCH}. */
    private String source;

    @Valid
    @NotEmpty(message = "La liste des recouvrements ne peut pas être vide !")
    private List<UnifiedRecoveryUnitDto> recoveries;
}
