package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TontineMemberCarnetVerificationDto {

    @NotNull(message = "Le statut de vérification est obligatoire")
    private Boolean verified;
}
