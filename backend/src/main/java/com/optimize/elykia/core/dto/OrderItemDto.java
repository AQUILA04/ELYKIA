package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class OrderItemDto {

    @NotNull(message = "L'ID de l'article ne peut pas être nul.")
    private Long articleId;

    @NotNull(message = "La quantité ne peut pas être nulle.")
    @Positive(message = "La quantité doit être positive.")
    private Integer quantity;
}
