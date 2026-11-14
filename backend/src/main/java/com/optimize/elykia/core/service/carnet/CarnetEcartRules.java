package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.exception.CustomValidationException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Règles pures du traitement d'un écart de carnet.
 */
public final class CarnetEcartRules {

    public static final double EPSILON = 0.0001d;
    /** Seuil déjà utilisé pour constituer un écart de caisse. */
    public static final double MONEY_EPSILON = 0.5d;

    private CarnetEcartRules() {
    }

    public record CreditSplit(double imputedOnCredit, double reliquat, double cash) {
    }

    public static boolean isPositive(double difference) {
        return difference > MONEY_EPSILON;
    }

    public static boolean isNegative(double difference) {
        return difference < -MONEY_EPSILON;
    }

    public static boolean isMaterial(double difference) {
        return Math.abs(difference) > MONEY_EPSILON;
    }

    /**
     * Mois courant : encaissement du jour. Mois passé : dernier jour de ce mois (rattrapage).
     */
    public static LocalDate tontineOperationDate(int year, int month, LocalDate today) {
        YearMonth target = YearMonth.of(year, month);
        YearMonth current = YearMonth.from(today);
        if (target.equals(current)) {
            return today;
        }
        if (target.isAfter(current)) {
            throw new CustomValidationException("Le mois contrôlé est postérieur au mois en cours.");
        }
        return target.atEndOfMonth();
    }

    /**
     * 1er jour du mois positif le plus ancien dont le rattrapage serait refusé
     * parce qu'il précède le début de participation. Null si aucun recul n'est nécessaire.
     * Ne précède pas le début de session.
     */
    public static LocalDate fieldControlAdhesionMove(
            LocalDate participationStart,
            List<YearMonth> pendingPositiveMonths,
            LocalDate today,
            LocalDate sessionStart) {
        if (participationStart == null || pendingPositiveMonths == null || pendingPositiveMonths.isEmpty() || today == null) {
            return null;
        }
        LocalDate earliest = null;
        for (YearMonth month : pendingPositiveMonths) {
            LocalDate operation = tontineOperationDate(month.getYear(), month.getMonthValue(), today);
            if (!operation.isBefore(participationStart)) {
                continue;
            }
            LocalDate first = month.atDay(1);
            if (sessionStart != null && first.isBefore(sessionStart)) {
                first = sessionStart;
            }
            if (earliest == null || first.isBefore(earliest)) {
                earliest = first;
            }
        }
        return earliest;
    }

    /**
     * La part imputée au crédit est plafonnée au reste dû. Le surplus devient un reliquat.
     * Les espèces du manquant restent l'écart entier.
     */
    public static CreditSplit creditSplit(double notebookAboveSystem, double remaining) {
        if (!isPositive(notebookAboveSystem)) {
            return new CreditSplit(0d, 0d, 0d);
        }
        double due = Math.max(0d, remaining);
        double imputed = Math.min(notebookAboveSystem, due);
        double reliquat = notebookAboveSystem - imputed;
        return new CreditSplit(imputed, reliquat, notebookAboveSystem);
    }

    /**
     * Écart à constituer, une fois retirés les manquants de carnet encore ouverts du jour.
     */
    public static double constitutionGap(double declared, double deposited, double openFieldControlRemaining) {
        return declared - deposited - Math.max(0d, openFieldControlRemaining);
    }

    /**
     * Cotisation d'un mois, de la plus récente à la plus ancienne, à réduire d'un excédent.
     * {@code keepAmount} est la part de cette cotisation qui reste conforme au carnet.
     */
    public record MonthCollection(long id, double amount) {
    }

    public record ReductionStep(long collectionId, double keepAmount) {
    }

    /**
     * Annule les cotisations en trop d'un mois, en commençant par les plus récentes.
     * Si la dernière dépasse l'excédent restant, elle est annulée puis recréée pour le montant à conserver.
     */
    public static List<ReductionStep> planMonthReduction(List<MonthCollection> newestFirst, double excess) {
        if (!isPositive(excess)) {
            return List.of();
        }
        List<ReductionStep> steps = new ArrayList<>();
        double remaining = excess;
        if (newestFirst != null) {
            for (MonthCollection collection : newestFirst) {
                if (remaining <= MONEY_EPSILON) {
                    break;
                }
                double amount = collection == null ? 0d : collection.amount();
                if (amount <= MONEY_EPSILON) {
                    continue;
                }
                if (amount > remaining + MONEY_EPSILON) {
                    steps.add(new ReductionStep(collection.id(), amount - remaining));
                    remaining = 0d;
                } else {
                    steps.add(new ReductionStep(collection.id(), 0d));
                    remaining -= amount;
                }
            }
        }
        if (remaining > MONEY_EPSILON) {
            throw new CustomValidationException(
                    "Les cotisations de ce mois ne couvrent pas l'excédent constaté sur le carnet.");
        }
        return steps;
    }
}
