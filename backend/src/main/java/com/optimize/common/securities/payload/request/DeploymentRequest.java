package com.optimize.common.securities.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeploymentRequest {
    @NotBlank(message = "Le code d'activation est obligatoire !")
    private String activationCode;
    @NotBlank(message = "Le nom de la société est obligatoire !")
    private String societyName;
}
