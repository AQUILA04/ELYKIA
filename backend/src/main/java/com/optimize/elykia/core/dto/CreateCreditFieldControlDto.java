package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateCreditFieldControlDto {
    @NotNull(message = "Le montant carnet est obligatoire")
    @PositiveOrZero(message = "Le montant carnet doit être positif ou nul")
    private Double notebookTotalAmount;

    private LocalDateTime observedAt;

    private String note;
}
