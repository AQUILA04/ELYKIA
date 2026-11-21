package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.ArticlePackagingType;
import com.optimize.elykia.inventory.domain.StockEntryPackagingMode;

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
