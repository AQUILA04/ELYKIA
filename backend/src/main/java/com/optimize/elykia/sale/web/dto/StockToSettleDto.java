package com.optimize.elykia.sale.web.dto;

/**
 * Mois clôturé dont un reste n'est ni retourné ni transformé en dette.
 *
 * @param stockId           stock mensuel
 * @param collector         commercial
 * @param year              année
 * @param month             mois (1-12)
 * @param itemsWithRemaining articles avec un reste
 * @param quantityRemaining quantités restantes
 * @param remainingValue    valeur restante au prix moyen de vente (montant d'une dette éventuelle)
 */
public record StockToSettleDto(Long stockId, String collector, int year, int month, int itemsWithRemaining,
        long quantityRemaining, double remainingValue) {
}
