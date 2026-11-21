package com.optimize.elykia.finance.application;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Répartit la tontine d'un versement : d'abord le reste du jour de saisie,
 * puis les rattrapages du plus ancien au plus récent.
 * Chaque date reçoit au plus le rattrapage saisi ce jour-là.
 * Le reste antérieur non soldé de cette date n'est pas complété.
 * Le reliquat de tontine reste sur le jour de saisie.
 */
public final class CashDepositCatchupAllocator {

    private static final double EPSILON = 0.01;

    private CashDepositCatchupAllocator() {
    }

    /**
     * @param capturedAmount rattrapage saisi le jour du versement pour cette date
     * @param openRemaining  tontine encore due sur cette date, y compris un solde plus ancien
     * @param cap            montant à affecter : le rattrapage du jour, sans dépasser le reste
     */
    public record CatchupCap(LocalDate collectionDate, double capturedAmount, double openRemaining, double cap) {
    }

    public record Slice(LocalDate date, double amount) {
    }

    public record Allocation(double credit, double tontineOnCaptureDay, double newBalance, double surplus,
            List<Slice> slices) {

        public double captureDayAmount() {
            return credit + tontineOnCaptureDay + newBalance + surplus;
        }

        public double physicalAmount() {
            double catchup = slices.stream().mapToDouble(Slice::amount).sum();
            return captureDayAmount() + catchup;
        }
    }

    public static Allocation allocate(double credit, double tontine, double newBalance, double surplus,
            double remainingTontineToday, List<CatchupCap> capsOldestFirst) {
        double creditSafe = Math.max(0.0, credit);
        double tontineSafe = Math.max(0.0, tontine);
        double newBalanceSafe = Math.max(0.0, newBalance);
        double surplusSafe = Math.max(0.0, surplus);
        double todayRoom = Math.max(0.0, remainingTontineToday);
        double todayFirst = Math.min(tontineSafe, todayRoom);
        double left = tontineSafe - todayFirst;
        List<Slice> slices = new ArrayList<>();
        if (capsOldestFirst != null) {
            for (CatchupCap cap : capsOldestFirst) {
                if (left <= EPSILON) {
                    break;
                }
                double room = targetAmount(cap);
                double take = Math.min(left, room);
                if (take > EPSILON) {
                    slices.add(new Slice(cap.collectionDate(), take));
                    left -= take;
                }
            }
        }
        return new Allocation(creditSafe, todayFirst + left, newBalanceSafe, surplusSafe, slices);
    }

    /**
     * Répartition avec un rattrapage saisi explicitement : la tontine reste sur le jour de saisie,
     * le rattrapage est réparti sur les dates du plus ancien au plus récent, chaque date plafonnée.
     *
     * @throws IllegalArgumentException si le rattrapage dépasse le total à encaisser
     */
    public static Allocation allocateExplicit(double credit, double tontine, double newBalance, double surplus,
            double catchup, List<CatchupCap> capsOldestFirst) {
        double left = Math.max(0.0, catchup);
        double available = capsOldestFirst == null ? 0.0
                : capsOldestFirst.stream().mapToDouble(CashDepositCatchupAllocator::targetAmount).sum();
        if (left > available + EPSILON) {
            throw new IllegalArgumentException(String.format(
                    "Le rattrapage saisi (%.0f) dépasse les rattrapages à encaisser (%.0f).", left, available));
        }
        List<Slice> slices = new ArrayList<>();
        if (capsOldestFirst != null) {
            for (CatchupCap cap : capsOldestFirst) {
                if (left <= EPSILON) {
                    break;
                }
                double take = Math.min(left, targetAmount(cap));
                if (take > EPSILON) {
                    slices.add(new Slice(cap.collectionDate(), take));
                    left -= take;
                }
            }
        }
        return new Allocation(Math.max(0.0, credit), Math.max(0.0, tontine), Math.max(0.0, newBalance),
                Math.max(0.0, surplus), slices);
    }

    /**
     * Cible par défaut : le rattrapage créé ce jour. Le reste de la date ne fait que
     * empêcher de verser plus que ce qui est encore dû.
     */
    static double targetAmount(CatchupCap cap) {
        double captured = Math.max(0.0, cap.capturedAmount());
        double open = Math.max(0.0, cap.openRemaining());
        return Math.min(captured, open);
    }
}
