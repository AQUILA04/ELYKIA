package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Utilitaires crédits de rattrapage (référence {@code RAT-*}).
 * Le rattachement stock se fait via {@code credit_articles.stock_item_id} du mois source.
 * La date de début du crédit doit rester dans le mois du stock source.
 */
public final class RattrapageCreditSupport {

    public static final String REFERENCE_PREFIX = "RAT-";
    public static final String STOCK_MARKER_PREFIX = "RATTRAPAGE_STOCK:";

    private RattrapageCreditSupport() {
    }

    /**
     * Ancre la date de début dans le mois du stock source.
     * Si aucune date n'est fournie, le dernier jour du mois est utilisé.
     */
    public static LocalDate resolveBeginDate(LocalDate requestedBeginDate, CommercialMonthlyStock sourceStock) {
        YearMonth stockMonth = YearMonth.of(sourceStock.getYear(), sourceStock.getMonth());
        LocalDate stockMonthStart = stockMonth.atDay(1);
        LocalDate stockMonthEnd = stockMonth.atEndOfMonth();
        if (requestedBeginDate == null) {
            return stockMonthEnd;
        }
        if (requestedBeginDate.isBefore(stockMonthStart) || requestedBeginDate.isAfter(stockMonthEnd)) {
            throw new CustomValidationException(
                    "La date de début d'un rattrapage doit être comprise entre le "
                            + stockMonthStart + " et le " + stockMonthEnd
                            + " (mois du stock source).");
        }
        return requestedBeginDate;
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
