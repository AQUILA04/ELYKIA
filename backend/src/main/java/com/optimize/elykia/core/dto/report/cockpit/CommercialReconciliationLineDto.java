package com.optimize.elykia.core.dto.report.cockpit;

/**
 * Rapprochement d'un commercial sur une période :
 * A Verser + rattrapages saisis = dû à la caisse ; dû − versé = reste.
 *
 * @param commercialUsername   commercial
 * @param status               situation du commercial
 * @param creditToDeposit      crédit à verser (recouvrements, avances, reliquats)
 * @param tontineToDeposit     tontine de la période
 * @param newBalanceToDeposit  solde des nouveaux comptes
 * @param amountToDeposit      A Verser de la période
 * @param catchupEntered       rattrapages saisis dans la période pour une cotisation hors période
 * @param cashDue              dû à la caisse
 * @param deposited            versé porté sur les rapports de la période
 * @param catchupReceived      rattrapages remis dans la période
 * @param deferred             cotisations de la période remises hors période
 * @param cashReceived         argent remis pendant la période
 * @param surplus              surplus non catégorisé
 * @param remainingCredit      crédit restant (couverture surplus déduite)
 * @param remainingTontine     tontine restante (couverture surplus déduite)
 * @param remainingNewBalance  solde Nx restant (couverture surplus déduite)
 * @param remainingCatchup     rattrapages saisis non remis
 * @param remaining            reste total à verser
 * @param historicalRemaining  manquants antérieurs à la période
 * @param operationsCount      nombre d'opérations terrain
 */
public record CommercialReconciliationLineDto(
        String commercialUsername,
        ReconciliationStatus status,
        double creditToDeposit,
        double tontineToDeposit,
        double newBalanceToDeposit,
        double amountToDeposit,
        double catchupEntered,
        double cashDue,
        double deposited,
        double catchupReceived,
        double deferred,
        double cashReceived,
        double surplus,
        double remainingCredit,
        double remainingTontine,
        double remainingNewBalance,
        double remainingCatchup,
        double remaining,
        double historicalRemaining,
        long operationsCount) {

    public enum ReconciliationStatus {
        /** Reste à verser. */
        LATE,
        /** Surplus non catégorisé, rien ne reste dû. */
        SURPLUS,
        /** Tout est versé. */
        UP_TO_DATE,
        /** Aucune opération ni versement. */
        INACTIVE
    }
}
