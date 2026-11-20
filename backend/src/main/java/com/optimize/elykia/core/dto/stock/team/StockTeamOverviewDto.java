package com.optimize.elykia.core.dto.stock.team;

import java.util.List;

/**
 * Vue équipe du stock commercial d'un mois : une ligne par commercial et les totaux.
 * Valeurs au prix moyen pondéré de vente (comme l'écran stock existant).
 *
 * @param year         année
 * @param month        mois (1-12)
 * @param closed       vrai si le mois est passé
 * @param totals       totaux de l'équipe
 * @param lines        une ligne par commercial, le plus gros reste à recouvrer d'abord
 */
public record StockTeamOverviewDto(int year, int month, boolean closed, Totals totals, List<StockTeamLineDto> lines) {

    /**
     * @param quantityTaken     articles pris au magasin
     * @param quantitySold      articles vendus
     * @param quantityReturned  articles retournés
     * @param quantityRemaining articles encore chez les commerciaux
     * @param takenValue        valeur prise
     * @param soldValue         valeur vendue
     * @param returnedValue     valeur retournée
     * @param remainingValue    valeur restante
     * @param debtValue         valeur mise en dette
     * @param dueValue          total dû : vendu + dette + restant
     * @param recoveredValue    recouvré : ventes recouvrées + dette réglée
     * @param leftToRecover     reste à recouvrer
     * @param recoveryRate      taux de recouvrement, 0-100
     * @param soldRate          part écoulée des quantités prises, 0-100
     * @param commercialsCount  commerciaux ayant un stock ce mois
     */
    public record Totals(long quantityTaken, long quantitySold, long quantityReturned, long quantityRemaining,
            double takenValue, double soldValue, double returnedValue, double remainingValue, double debtValue,
            double dueValue, double recoveredValue, double leftToRecover, double recoveryRate, double soldRate,
            int commercialsCount) {
    }
}
