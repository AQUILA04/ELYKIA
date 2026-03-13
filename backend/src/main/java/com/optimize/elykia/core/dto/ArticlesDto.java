package com.optimize.elykia.core.dto;

import com.optimize.common.entities.annotations.NotStringValue;
import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import lombok.ToString;

@Data
@ToString
public class ArticlesDto {
    private Long id;
    @NotNull(message = "Le prix d'achat est obligatoire !")
    @Positive
    private Double purchasePrice;
    @NotNull(message = "Le prix de vente est obligatoire !")
    @Positive
    private Double sellingPrice;
    @NotNull(message = "Le prix de vente à crédit est obligatoire !")
    @Positive
    private Double creditSalePrice;
    @NotBlank(message = "Le libelle de l'article est obligatoire !")
    @NotStringValue(message = "La valeur \"string\" n'est pas autorisée !")
    private String name;
    @NotBlank(message = "La marque de l'article est obligatoire !")
    @NotStringValue(message = "La valeur \"string\" n'est pas autorisée !")
    private String marque;
    @NotBlank(message = "Le model de l'article est obligatoire !")
    @NotStringValue(message = "La valeur \"string\" n'est pas autorisée !")
    private String model;
    @NotBlank(message = "La type de l'article est obligatoire !")
    @NotStringValue(message = "La valeur \"string\" n'est pas autorisée !")
    private String type;
    @PositiveOrZero(message = "La valeur de la quantité de l'article doit être supérieure ou égale à zero !")
    private Integer stockQuantity = 0;

    @PositiveOrZero
    private Integer reorderPoint; // Seuil de réapprovisionnement

    @PositiveOrZero
    private Integer optimalStockLevel; // Niveau de stock optimal

    private java.time.LocalDate lastRestockDate;

    private String category; // Catégorie produit pour analyse

    private Boolean isSeasonal = false;
    private State state =State.ENABLED;
}
