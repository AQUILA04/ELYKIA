package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreditArticlesDto {
    private Long id;
    private Long creditId;
    @NotNull(message = "L'identifiant de l'article lié au crédit est obligatoire !")
    private Long articleId;
    @NotNull(message = "La quantité de l'article lié au crédit est obligatoire")
    private Integer quantity;
    private Long stockItemId;
    private State state =State.ENABLED;

}
