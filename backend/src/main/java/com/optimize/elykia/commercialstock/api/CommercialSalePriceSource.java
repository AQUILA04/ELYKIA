package com.optimize.elykia.commercialstock.api;

/** Origine du prix de vente appliqué lors d'une sortie de stock commercial (le coût d'achat reste toujours celui de la couche). */
public enum CommercialSalePriceSource {
    /** Prix de vente porté par la couche FIFO (figé à la sortie magasin ou au dernier réalignement). */
    LAYER_FIFO,
    /** Prix catalogue courant de l'article au moment de la vente. */
    CURRENT_CATALOG;

    /** Accepte aussi la valeur historique {@code CATALOG} des paramètres applicatifs. */
    public static CommercialSalePriceSource fromParameter(String value, CommercialSalePriceSource defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        String normalized = value.trim().toUpperCase();
        return switch (normalized) {
            case "CATALOG", "CURRENT_CATALOG" -> CURRENT_CATALOG;
            case "LAYER_FIFO", "FIFO_LOT", "FIFO" -> LAYER_FIFO;
            default -> defaultValue;
        };
    }
}
