package com.optimize.elykia.core.dto;

import com.optimize.common.entities.annotations.NotStringValue;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AgencyDto {
    private Long id;
    @NotBlank(message = "Le nom de l'agence est obligatoire !")
    @NotStringValue(message = "Le nom de l'agence ne peut pas être 'string'")
    private String name;
    @NotBlank(message = "Le code de l'agence est obligatoire !")
    @NotStringValue(message = "Le code de l'agence ne peut pas être 'string'")
    private String code;
    @NotBlank(message = "Le numéro de téléphone de l'agence est obligatoire !")
    @NotStringValue(message = "Le numéro de téléphone de l'agence ne peut pas être 'string'")
    private String phone;
}
