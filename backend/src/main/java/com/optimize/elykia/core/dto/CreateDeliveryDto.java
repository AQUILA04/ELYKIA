package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateDeliveryDto {

    @NotNull(message = "L'identifiant du membre de la tontine est requis")
    private Long tontineMemberId;
    private LocalDateTime requestDate;

    @Valid
    @NotEmpty(message = "La liste des articles ne peut pas être vide")
    private List<DeliveryItemDto> items;
}