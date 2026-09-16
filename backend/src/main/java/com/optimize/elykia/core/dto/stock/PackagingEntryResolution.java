package com.optimize.elykia.core.dto.stock;

import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;

/**
 * Résultat de la conversion packaging → quantité unitaire + PU achat.
 */
public record PackagingEntryResolution(
        int quantity,
        double unitPrice,
        double totalPrice,
        StockEntryPackagingMode entryPackagingMode,
        Integer packageCount,
        Double packagePrice,
        ArticlePackagingType packagingTypeSnapshot,
        Integer unitsPerPackageSnapshot
) {
}
