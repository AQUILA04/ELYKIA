package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * Représente une case du mini-calendrier semaine.
 * Renvoyé par GET /api/v1/credits/echeance/calendar?from=...&to=...
 */
@Getter
@Builder
public class CreditCalendarDayDTO {

    private LocalDate date;

    /** Nombre total de crédits arrivant à terme ce jour */
    private int       totalCount;

    /** Nombre de crédits non soldés ce jour (totalAmountRemaining > 0) */
    private int       unsettledCount;

    /** true si au moins un crédit du jour n'est pas soldé */
    private boolean   hasUrgent;
}
