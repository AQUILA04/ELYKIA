package com.optimize.elykia.core.dto.report.cockpit;

import java.time.LocalDate;
import java.util.List;

/**
 * Cockpit équipe du rapport commerciaux : tout l'écran en une réponse.
 *
 * @param startDate      début de la période
 * @param endDate        fin de la période
 * @param totals         totaux de la période
 * @param previousTotals totaux de la période précédente de même durée (null si non demandé)
 * @param cash           synthèse caisse (toutes caisses)
 * @param lines          une ligne par commercial, la plus en retard d'abord
 * @param alerts         points d'attention, le plus gros montant d'abord
 */
public record CommercialCockpitDto(
        LocalDate startDate,
        LocalDate endDate,
        Totals totals,
        Totals previousTotals,
        Cash cash,
        List<CommercialReconciliationLineDto> lines,
        List<Alert> alerts) {

    /**
     * @param cashDue           dû à la caisse : A Verser + rattrapages saisis hors période
     * @param amountToDeposit   A Verser de la période (opérations rattachées à la période)
     * @param catchupEntered    rattrapages saisis pendant la période pour une cotisation hors période
     * @param cashReceived      argent réellement remis pendant la période
     * @param deposited         versé porté sur les rapports de la période
     * @param remaining         reste à verser (période + rattrapages saisis non remis)
     * @param surplus           surplus non catégorisé
     * @param historicalRemaining manquants antérieurs à la période
     * @param depositRate       part du dû déjà versée, de 0 à 1 (1 quand rien n'est dû)
     * @param creditCollected   recouvrements crédit
     * @param tontineCollected  collectes tontine rattachées à la période
     * @param newBalance        solde des nouveaux comptes
     * @param operationsCount   nombre d'opérations terrain
     * @param commercialsCount  commerciaux présents dans la période
     */
    public record Totals(
            double cashDue,
            double amountToDeposit,
            double catchupEntered,
            double cashReceived,
            double deposited,
            double remaining,
            double surplus,
            double historicalRemaining,
            double depositRate,
            double creditCollected,
            double tontineCollected,
            double newBalance,
            long operationsCount,
            int commercialsCount) {
    }

    /**
     * @param received              total encaissé (toutes caisses)
     * @param expensesWithSupply    dépenses, approvisionnements compris
     * @param expensesWithoutSupply dépenses hors approvisionnement
     * @param balance               solde : encaissé − dépenses hors approvisionnement
     */
    public record Cash(double received, double expensesWithSupply, double expensesWithoutSupply, double balance) {
    }

    /**
     * @param type               nature du point d'attention
     * @param commercialUsername commercial concerné
     * @param amount             montant en jeu
     * @param canRebalance       vrai si un surplus peut couvrir un manquant (période ou antérieur)
     */
    public record Alert(AlertType type, String commercialUsername, double amount, boolean canRebalance) {
    }

    public enum AlertType {
        /** Reste à verser sur la période. */
        REMAINING,
        /** Rattrapages saisis non encore remis. */
        CATCHUP_NOT_DEPOSITED,
        /** Surplus non catégorisé. */
        SURPLUS,
        /** Manquants antérieurs à la période. */
        HISTORICAL_REMAINING
    }
}
