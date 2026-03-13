package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class StockEntry {
    @NotNull(message = "L'identifiant de l'article est obligatoire !")
    private Long articleId;
    @NotNull(message = "La quantité d'entrée pour l'article est obligatoire !")
    @PositiveOrZero(message = "La valeur de la quantité de l'article doit être supérieure ou égale à zero !")
    private Integer quantity;
    private Double unitPrice;
    private State state =State.ENABLED;

}
