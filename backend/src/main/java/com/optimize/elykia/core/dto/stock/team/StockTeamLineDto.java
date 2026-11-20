package com.optimize.elykia.core.dto.stock.team;

/**
 * Stock d'un commercial sur un mois, pour la vue équipe.
 *
 * @param stockId            stock mensuel
 * @param collector          commercial
 * @param itemsCount         articles pris
 * @param itemsWithRemaining articles avec un reste
 * @param quantityTaken      quantités prises
 * @param quantitySold       quantités vendues
 * @param quantityReturned   quantités retournées
 * @param quantityRemaining  quantités restantes
 * @param takenValue         valeur prise
 * @param soldValue          valeur vendue
 * @param returnedValue      valeur retournée
 * @param remainingValue     valeur restante
 * @param debtValue          valeur mise en dette
 * @param dueValue           total dû : vendu + dette + restant
 * @param recoveredValue     recouvré : ventes recouvrées + dette réglée
 * @param leftToRecover      reste à recouvrer
 * @param recoveryRate       taux de recouvrement, 0-100
 * @param soldRate           part écoulée des quantités prises, 0-100
 * @param merchandiseDebtId  dette marchandise active (null si aucune)
 * @param debtStatus         statut de la dette (OPEN, PARTIAL…), null si aucune
 * @param debtRemaining      reste à payer sur la dette
 * @param toSettle           mois passé avec un reste sans dette : à régulariser
 */
public record StockTeamLineDto(
        Long stockId,
        String collector,
        int itemsCount,
        int itemsWithRemaining,
        long quantityTaken,
        long quantitySold,
        long quantityReturned,
        long quantityRemaining,
        double takenValue,
        double soldValue,
        double returnedValue,
        double remainingValue,
        double debtValue,
        double dueValue,
        double recoveredValue,
        double leftToRecover,
        double recoveryRate,
        double soldRate,
        Long merchandiseDebtId,
        String debtStatus,
        double debtRemaining,
        boolean toSettle) {
}
