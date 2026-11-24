package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateDeliveryItemsDto {

    @Valid
    @NotEmpty(message = "La liste des articles ne peut pas être vide")
    private List<DeliveryItemDto> items;

    /** Vrai : la date de livraison prévue est remplacée par {@code plannedDeliveryDate} (null l'efface). */
    private boolean updatePlannedDate;

    /** Nouvelle date de livraison prévue, lue seulement si {@code updatePlannedDate} est vrai. */
    private LocalDate plannedDeliveryDate;
}
