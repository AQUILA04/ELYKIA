package com.optimize.elykia.tontine.web.dto;

/**
 * Réservation indicative d'un article du stock tontine d'un commercial :
 * quantité déjà commandée par des membres pas encore livrés. Rien n'est bloqué ni sorti du stock.
 */
public record TontineArticleReservationDto(Long articleId, long reservedQuantity, long orderCount) {
}
