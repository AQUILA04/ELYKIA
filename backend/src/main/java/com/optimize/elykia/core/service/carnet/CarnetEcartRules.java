package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.exception.CustomValidationException;

import java.time.LocalDate;
import java.time.YearMonth;

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
}
