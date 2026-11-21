package com.optimize.elykia.finance.api;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Port SPI permettant au module {@code finance} de lire les lignes de rattrapage tontine
 * sans dépendre de {@code core}/{@code tontine}.
 */
public interface TontineCatchupQueryPort {

    List<Object[]> findCatchupRowsByCommercialAndCreatedDate(
            String commercialUsername, LocalDateTime dayStart, LocalDateTime dayEnd);

    List<Object[]> sumCatchupEnteredByCommercial(LocalDateTime periodStart, LocalDateTime periodEnd);
}
