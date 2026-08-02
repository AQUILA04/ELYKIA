package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateTontineMemberFieldControlMonthDto {

    @NotNull(message = "L'année est obligatoire")
    private Integer year;

    @NotNull(message = "Le mois est obligatoire")
    @Min(value = 1, message = "Le mois doit être entre 1 et 12")
    @Max(value = 12, message = "Le mois doit être entre 1 et 12")
    private Integer month;

    @NotNull(message = "Le montant carnet est obligatoire")
    @PositiveOrZero(message = "Le montant carnet doit être positif ou nul")
    private Double notebookAmount;
}
