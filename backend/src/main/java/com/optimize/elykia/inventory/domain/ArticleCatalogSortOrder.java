package com.optimize.elykia.inventory.domain;

import java.util.Comparator;

/**
 * Règles de tri canoniques du catalogue articles et des lignes de réception.
 */
public final class ArticleCatalogSortOrder {

    private ArticleCatalogSortOrder() {
    }

    public static Comparator<Articles> byTypeMarqueModelName() {
        return Comparator
                .comparing(Articles::getType, nullSafeString())
                .thenComparing(Articles::getMarque, nullSafeString())
                .thenComparing(Articles::getModel, nullSafeString())
                .thenComparing(Articles::getName, nullSafeString());
    }

    public static Comparator<StockReceptionItem> forStockReceptionItems() {
        return Comparator.comparing(StockReceptionItem::getArticle, Comparator.nullsLast(byTypeMarqueModelName()));
    }

    public static Comparator<String> nullSafeString() {
        return Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER);
    }
}
