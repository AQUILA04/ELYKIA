package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.enumaration.RmFieldListProgress;
import com.optimize.elykia.core.service.carnet.CarnetEcartRules;

import java.time.LocalDateTime;

/**
 * Classification Terrain partagée avec les prédicats SQL de
 * {@code RmFieldListProgressSql}. À faire = jamais contrôlé.
 * Déjà fait = écart encore ouvert, ou contrôle clôturé dans les 30 derniers jours.
 * Un contrôle clôturé plus ancien n'est visible que dans Tous.
 */
public final class RmFieldProgressRules {

    public static final int WINDOW_DAYS = 30;

    public enum Bucket {
        TODO,
        DONE,
        ALL_ONLY
    }

    public record Snapshot(boolean hasControl, LocalDateTime observedAt, boolean openGap) {
    }

    private RmFieldProgressRules() {
    }

    public static Bucket classify(Snapshot snapshot, LocalDateTime now) {
        if (snapshot == null || !snapshot.hasControl()) {
            return Bucket.TODO;
        }
        if (snapshot.openGap() || isRecent(snapshot.observedAt(), now)) {
            return Bucket.DONE;
        }
        return Bucket.ALL_ONLY;
    }

    public static boolean matches(RmFieldListProgress progress, Snapshot snapshot, LocalDateTime now) {
        if (progress == null || progress == RmFieldListProgress.ALL) {
            return true;
        }
        Bucket bucket = classify(snapshot, now);
        if (progress == RmFieldListProgress.TODO) {
            return bucket == Bucket.TODO;
        }
        return bucket == Bucket.DONE;
    }

    /** {@code observedAt >= now - 30 jours}. Une date absente n'est pas récente. */
    public static boolean isRecent(LocalDateTime observedAt, LocalDateTime now) {
        if (observedAt == null || now == null) {
            return false;
        }
        return !observedAt.isBefore(now.minusDays(WINDOW_DAYS));
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
