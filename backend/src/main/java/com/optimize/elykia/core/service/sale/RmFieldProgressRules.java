package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.enumaration.RmFieldListProgress;
import com.optimize.elykia.core.service.carnet.CarnetEcartRules;

import java.time.LocalDateTime;

/**
 * Classification Terrain partagée avec les prédicats SQL de
 * {@code RmFieldListProgressSql}. À faire = jamais contrôlé.
 * Déjà fait = un contrôle existe déjà, quelle que soit sa date.
 */
public final class RmFieldProgressRules {

    public enum Bucket {
        TODO,
        DONE
    }

    public record Snapshot(boolean hasControl, LocalDateTime observedAt, boolean openGap) {
    }

    private RmFieldProgressRules() {
    }

    public static Bucket classify(Snapshot snapshot) {
        if (snapshot == null || !snapshot.hasControl()) {
            return Bucket.TODO;
        }
        return Bucket.DONE;
    }

    public static boolean matches(RmFieldListProgress progress, Snapshot snapshot) {
        if (progress == null || progress == RmFieldListProgress.ALL) {
            return true;
        }
        Bucket bucket = classify(snapshot);
        if (progress == RmFieldListProgress.TODO) {
            return bucket == Bucket.TODO;
        }
        return bucket == Bucket.DONE;
    }

    /**
     * Écart crédit encore ouvert : écart matériel sans décision acceptée ou refusée.
     * Même sémantique que {@code CarnetEcartRecontrolPolicy.summarizeCredit}.
     */
    public static boolean creditOpenGap(FieldControlStatus status, Double difference, CarnetEcartStatus decision) {
        if (status != FieldControlStatus.ECART) {
            return false;
        }
        double amount = difference != null ? difference : 0d;
        if (!CarnetEcartRules.isMaterial(amount)) {
            return false;
        }
        return decision == null || decision == CarnetEcartStatus.PENDING;
    }

    /**
     * Écart tontine encore ouvert : au moins une ligne matérielle sans décision terminale,
     * sur un contrôle au statut ECART.
     */
    public static boolean tontineOpenGap(FieldControlStatus status, boolean anyOpenMaterialLine) {
        return status == FieldControlStatus.ECART && anyOpenMaterialLine;
    }

    public static boolean tontineLineOpen(double difference, CarnetEcartStatus decision) {
        if (!CarnetEcartRules.isMaterial(difference)) {
            return false;
        }
        return decision != CarnetEcartStatus.ACCEPTED && decision != CarnetEcartStatus.REJECTED;
    }
}
