package com.optimize.elykia.tontine.application;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.tontine.infrastructure.persistence.TontineCollectionRepository;
import com.optimize.elykia.finance.api.TontineCatchupQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Adaptateur SPI liant le module {@code finance} aux requêtes de rattrapages tontine.
 */
@Component
@RequiredArgsConstructor
public class TontineCatchupQueryPortAdapter implements TontineCatchupQueryPort {

    private final TontineCollectionRepository tontineCollectionRepository;

    @Override
    public List<Object[]> findCatchupRowsByCommercialAndCreatedDate(
            String commercialUsername, LocalDateTime dayStart, LocalDateTime dayEnd) {
        return tontineCollectionRepository.findCatchupRowsByCommercialAndCreatedDate(
                commercialUsername, State.ENABLED, dayStart, dayEnd);
    }

    @Override
    public List<Object[]> sumCatchupEnteredByCommercial(LocalDateTime periodStart, LocalDateTime periodEnd) {
        return tontineCollectionRepository.sumCatchupEnteredByCommercial(
                State.ENABLED, periodStart, periodEnd);
    }
}
