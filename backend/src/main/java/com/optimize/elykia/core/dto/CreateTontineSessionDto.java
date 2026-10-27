package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateTontineSessionDto {

    @NotBlank(message = "Le nom de la session est obligatoire.")
    @Size(max = 120, message = "Le nom de la session ne peut pas dépasser 120 caractères.")
    private String name;

    @Size(max = 40, message = "Le code de la session ne peut pas dépasser 40 caractères.")
    private String code;

    @NotNull(message = "La date de début est obligatoire.")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est obligatoire.")
    private LocalDate endDate;
}
