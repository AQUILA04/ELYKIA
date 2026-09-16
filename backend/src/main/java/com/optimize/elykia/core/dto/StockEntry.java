package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class StockEntry {
    @NotNull(message = "L'identifiant de l'article est obligatoire !")
    private Long articleId;

    /**
     * Quantité unitaire. Obligatoire en mode UNIT (ou legacy).
     * Ignorée / recalculée en mode WHOLESALE / HALF_WHOLESALE (FIFO).
     */
    @PositiveOrZero(message = "La valeur de la quantité de l'article doit être supérieure ou égale à zero !")
    private Integer quantity;

    private Double unitPrice;

    /** Mode d'entrée packaging — utilisé uniquement si FIFO est actif. */
    private StockEntryPackagingMode entryPackagingMode;

    /** Nombre de colis (WHOLESALE) ou demi-colis (HALF_WHOLESALE). */
    private Integer packageCount;

    /** Prix du colis ou demi-colis saisi. */
    private Double packagePrice;
}
