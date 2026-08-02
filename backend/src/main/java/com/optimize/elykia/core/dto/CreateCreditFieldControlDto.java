package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateCreditFieldControlDto {

    @NotBlank(message = "La référence d'idempotence est obligatoire")
    @Size(max = 64, message = "La référence ne peut pas dépasser 64 caractères")
    private String reference;

    @NotNull(message = "Le montant carnet est obligatoire")
    @PositiveOrZero(message = "Le montant carnet doit être positif ou nul")
    private Double notebookTotalAmount;

    private LocalDateTime observedAt;

    private String note;
}
