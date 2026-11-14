package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UpdateDeliveryItemsDto {

    @Valid
    @NotEmpty(message = "La liste des articles ne peut pas être vide")
    private List<DeliveryItemDto> items;
}
