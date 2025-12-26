package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class OrderDto {

    @NotNull(message = "L'ID du client ne peut pas être nul.")
    private Long clientId;

    @Valid
    @NotEmpty(message = "La liste des articles ne peut pas être vide.")
    private Set<OrderItemDto> items;
}
