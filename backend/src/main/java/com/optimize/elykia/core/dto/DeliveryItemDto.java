package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeliveryItemDto {
    
    @NotNull(message = "L'identifiant de l'article est requis")
    private Long articleId;
    
    @NotNull(message = "La quantité est requise")
    @Min(value = 1, message = "La quantité doit être au moins 1")
    private Integer quantity;

    @NotNull(message = "Le prix unitaire est requis")
    @Min(value = 0, message = "Le prix unitaire ne peut pas être négatif")
    private Double unitPrice;
}
