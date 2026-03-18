package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.UrgencyLevel;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * DTO renvoyé au frontend pour la page "Crédits à échéance".
 *
 * Champs calculés côté backend :
 *   - daysUntilEnd  : nombre de jours entre today et expectedEndDate (peut être 0 ou négatif)
 *   - urgencyLevel  : TODAY / TOMORROW / THIS_WEEK / FUTURE
 *   - paidPercentage: (totalAmountPaid / totalAmount) * 100
 *   - isSettled     : totalAmountRemaining == 0
 */
@Getter
@Builder
public class CreditEcheanceDTO {

    // ── Identité ──────────────────────────────────────────────────────────
    private Long         id;
    private String       reference;

    // ── Client ────────────────────────────────────────────────────────────
    private String       clientName;
    private String       clientPhone;

    // ── Commercial ────────────────────────────────────────────────────────
    private String       collector;

    // ── Montants ──────────────────────────────────────────────────────────
    private Double       totalAmount;
    private Double       totalAmountPaid;
    private Double       totalAmountRemaining;
    private Double       dailyStake;
    private Integer      remainingDaysCount;

    /** (totalAmountPaid / totalAmount) * 100, arrondi à l'entier */
    private Integer      paidPercentage;

    /** true si totalAmountRemaining == 0 */
    private boolean      settled;

    // ── Dates ─────────────────────────────────────────────────────────────
    private LocalDate    beginDate;
    private LocalDate    expectedEndDate;

    // ── Urgence calculée ──────────────────────────────────────────────────
    /**
     * Nombre de jours entre today et expectedEndDate.
     *   0  = échéance aujourd'hui
     *   1  = demain
     *  -N  = dépassée depuis N jours (ne devrait pas apparaître ici,
     *         mais géré par sécurité)
     */
    private int          daysUntilEnd;

    /**
     * Niveau d'urgence calculé à partir de daysUntilEnd :
     *   TODAY     : daysUntilEnd == 0
     *   TOMORROW  : daysUntilEnd == 1
     *   THIS_WEEK : daysUntilEnd  2..6
     *   FUTURE    : daysUntilEnd >= 7
     */
    private UrgencyLevel urgencyLevel;

    // ── Statut ────────────────────────────────────────────────────────────
    private CreditStatus status;
}
