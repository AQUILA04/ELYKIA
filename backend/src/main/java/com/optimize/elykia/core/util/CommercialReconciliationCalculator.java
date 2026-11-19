package com.optimize.elykia.core.util;

import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto.ReconciliationStatus;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;

/**
 * Rapprochement d'un commercial sur une période, à partir du rapport agrégé de la période.
 * Mêmes règles que le frontend ({@code daily-commercial-report.model.ts}, {@code cash-synthesis.ts}) :
 * <ul>
 * <li>reste par catégorie = à verser − versé − couverture surplus, jamais négatif ;</li>
 * <li>total encaissé = versé − cotisations remises hors période + rattrapages remis ;</li>
 * <li>dû à la caisse = A Verser + rattrapages saisis hors période.</li>
 * </ul>
 */
public final class CommercialReconciliationCalculator {

    private static final double EPSILON = 0.01;

    private CommercialReconciliationCalculator() {
    }

    /**
     * @param report          rapport agrégé de la période (null : aucune opération)
     * @param username        commercial
     * @param catchupEntered  rattrapages saisis dans la période pour une cotisation hors période
     * @param catchupReceived rattrapages remis dans la période
     * @param deferred        cotisations de la période remises hors période
     */
    public static CommercialReconciliationLineDto line(DailyCommercialReport report, String username,
            double catchupEntered, double catchupReceived, double deferred) {
        double creditToDeposit = CashDepositCategoryCalculator.creditToDeposit(report);
        double tontineToDeposit = CashDepositCategoryCalculator.tontineToDeposit(report);
        double newBalanceToDeposit = CashDepositCategoryCalculator.newBalanceToDeposit(report);
        double amountToDeposit = report != null ? safe(report.getTotalAmountToDeposit()) : 0.0;
        double deposited = report != null ? safe(report.getTotalAmountDeposited()) : 0.0;
        double surplus = report != null ? safe(report.getTotalSurplusAmountDeposited()) : 0.0;
        double historical = report != null ? safe(report.getHistoricalRemaining()) : 0.0;

        double remainingCredit = report == null ? 0.0 : Math.max(0.0, creditToDeposit
                - safe(report.getTotalCreditAmountDeposited()) - safe(report.getSurplusCoverageCredit()));
        double remainingTontine = report == null ? 0.0 : Math.max(0.0, tontineToDeposit
                - safe(report.getTotalTontineAmountDeposited()) - safe(report.getSurplusCoverageTontine()));
        double remainingNewBalance = report == null ? 0.0 : Math.max(0.0, newBalanceToDeposit
                - safe(report.getTotalNewBalanceAmountDeposited()) - safe(report.getSurplusCoverageNewBalance()));
        double entered = Math.max(0.0, catchupEntered);
        double remainingCatchup = Math.max(0.0, entered - Math.max(0.0, catchupReceived));
        double remaining = remainingCredit + remainingTontine + remainingNewBalance + remainingCatchup;

        long operations = operationsCount(report);
        double cashReceived = deposited - deferred + catchupReceived;

        return new CommercialReconciliationLineDto(
                username,
                status(operations, deposited, cashReceived, entered, remaining, surplus),
                creditToDeposit,
                tontineToDeposit,
                newBalanceToDeposit,
                amountToDeposit,
                entered,
                amountToDeposit + entered,
                deposited,
                catchupReceived,
                deferred,
                cashReceived,
                surplus,
                remainingCredit,
                remainingTontine,
                remainingNewBalance,
                remainingCatchup,
                remaining,
                historical,
                operations);
    }

    static ReconciliationStatus status(long operations, double deposited, double cashReceived, double catchupEntered,
            double remaining, double surplus) {
        if (remaining > EPSILON) {
            return ReconciliationStatus.LATE;
        }
        if (surplus > EPSILON) {
            return ReconciliationStatus.SURPLUS;
        }
        if (operations == 0 && Math.abs(deposited) <= EPSILON && Math.abs(cashReceived) <= EPSILON
                && catchupEntered <= EPSILON) {
            return ReconciliationStatus.INACTIVE;
        }
        return ReconciliationStatus.UP_TO_DATE;
    }

    /** Opérations terrain : ventes, recouvrements, commandes, nouveaux clients, tontine. */
    public static long operationsCount(DailyCommercialReport report) {
        if (report == null) {
            return 0L;
        }
        return count(report.getCreditSalesCount())
                + count(report.getCollectionsCount())
                + count(report.getOrdersCount())
                + count(report.getNewClientsCount())
                + count(report.getTontineMembersCount())
                + count(report.getTontineCollectionsCount())
                + count(report.getTontineDeliveriesCount());
    }

    /** Part du dû déjà réglée, entre 0 et 1. Rien dû : 1. */
    public static double depositRate(double cashDue, double remaining) {
        if (cashDue <= EPSILON) {
            return 1.0;
        }
        return Math.max(0.0, Math.min(1.0, (cashDue - remaining) / cashDue));
    }

    private static long count(Integer value) {
        return value != null ? value : 0L;
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }
}
