package com.optimize.elykia.finance.api;

import java.time.LocalDateTime;

/**
 * Port SPI permettant au module {@code finance} d'interroger et réinitialiser les indicateurs
 * comptables journaliers des crédits sans dépendre de {@code core}/{@code sale}.
 */
public interface CreditAccountingPort {

    int resetDailyPaidForActiveCredits();

    Double sumCollectedAmountByDate(LocalDateTime start, LocalDateTime end);

    Double sumCollectedAmountByCollectorAndDate(String collector, LocalDateTime start, LocalDateTime end);

    Double sumCollectedAmountByDailyAccountancyId(Long dailyAccountancyId);
}
