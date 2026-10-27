package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TontineSessionUpdateDto {

    @Size(max = 120, message = "Le nom de la session ne peut pas dépasser 120 caractères.")
    private String name;

    @NotNull(message = "La date de début ne peut pas être nulle.")
    private LocalDate startDate;

    @NotNull(message = "La date de fin ne peut pas être nulle.")
    private LocalDate endDate;
}
