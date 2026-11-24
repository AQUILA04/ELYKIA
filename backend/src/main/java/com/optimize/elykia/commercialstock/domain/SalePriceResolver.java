package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;

/** Détermine le prix de vente unitaire appliqué à une portion de couche (le coût d'achat n'est jamais touché). */
final class SalePriceResolver {

    private SalePriceResolver() {
    }

    static double resolve(CommercialSalePriceSource source, CommercialStockLayer layer, Double catalogPrice) {
        Double layerPrice = layer.getEffectiveSalePrice();
        return switch (source == null ? CommercialSalePriceSource.LAYER_FIFO : source) {
            case CURRENT_CATALOG -> catalogPrice != null ? catalogPrice : fallback(layerPrice);
            case LAYER_FIFO -> layerPrice != null ? layerPrice : fallback(catalogPrice);
        };
    }

    private static double fallback(Double value) {
        return value != null ? value : 0d;
    }
}
