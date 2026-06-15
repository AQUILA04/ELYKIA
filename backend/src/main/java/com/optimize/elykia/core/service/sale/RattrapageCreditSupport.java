package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;

/**
 * Utilitaires crédits de rattrapage (référence {@code RAT-*}).
 * Le rattachement stock se fait via {@code credit_articles.stock_item_id} du mois source,
 * pas via {@code credit.begin_date} (souvent le mois courant de saisie).
 */
public final class RattrapageCreditSupport {

    public static final String REFERENCE_PREFIX = "RAT-";
    public static final String STOCK_MARKER_PREFIX = "RATTRAPAGE_STOCK:";

    private RattrapageCreditSupport() {
    }

    public static boolean isRattrapageReference(String reference) {
        return reference != null && reference.startsWith(REFERENCE_PREFIX);
    }

    public static String buildStockMarker(CommercialMonthlyStock sourceStock, String note) {
        String marker = STOCK_MARKER_PREFIX
                + sourceStock.getId()
                + ":"
                + sourceStock.getYear()
                + "-"
                + sourceStock.getMonth();
        if (note != null && !note.isBlank()) {
            return marker + "|" + note.trim();
        }
        return marker;
    }
}
