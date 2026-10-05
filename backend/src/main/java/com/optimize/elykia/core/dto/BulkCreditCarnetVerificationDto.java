package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BulkCreditCarnetVerificationDto {

    @NotEmpty(message = "Au moins un crédit doit être sélectionné")
    @Size(max = 500, message = "Maximum 500 crédits par opération")
    private List<Long> creditIds;

    @NotNull(message = "Le statut de vérification est obligatoire")
    private Boolean verified;
}
