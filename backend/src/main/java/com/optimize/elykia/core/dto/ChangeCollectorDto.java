package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeCollectorDto {
    @NotBlank(message = "Le nouveau commercial est obligatoire")
    private String newCollector;
}
