package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TontineMemberAdhesionDateDto {
    @NotNull(message = "La date d'adhésion est obligatoire.")
    private LocalDate registrationDate;
}
