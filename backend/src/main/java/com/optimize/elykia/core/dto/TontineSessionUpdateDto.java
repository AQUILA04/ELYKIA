package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TontineSessionUpdateDto {

    @NotNull(message = "La date de début ne peut pas être nulle.")
    private LocalDate startDate;

    @NotNull(message = "La date de fin ne peut pas être nulle.")
    private LocalDate endDate;
}
