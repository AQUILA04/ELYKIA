package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.dto.TontineCollectionKpiDto;
import com.optimize.elykia.core.dto.TontineCollectionWebDto;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TontineCollectionWebService {

    private final TontineCollectionRepository tontineCollectionRepository;

    public Page<TontineCollectionWebDto> getCollectionsForWeb(LocalDateTime dateFrom, LocalDateTime dateTo, String commercial, Pageable pageable) {
        log.info("Fetching Tontine Collections between {} and {} for commercial: {}", dateFrom, dateTo, commercial != null ? commercial : "ALL");

        if (commercial != null && !commercial.trim().isEmpty() && !commercial.equals("all")) {
            return tontineCollectionRepository.findWebDtosByCommercialAndDateRange(commercial, dateFrom, dateTo, pageable);
        } else {
            return tontineCollectionRepository.findWebDtosByDateRange(dateFrom, dateTo, pageable);
        }
    }

    public TontineCollectionKpiDto getKpiSummary(LocalDateTime dateFrom, LocalDateTime dateTo, String commercial) {
        log.info("Fetching Tontine Collection KPIs between {} and {} for commercial: {}", dateFrom, dateTo, commercial != null ? commercial : "ALL");

        Double totalAmount;
        Long totalMises;

        if (commercial != null && !commercial.trim().isEmpty() && !commercial.equals("all")) {
            totalAmount = tontineCollectionRepository.sumAmountByCommercialAndDateRange(commercial, dateFrom, dateTo);
            totalMises = tontineCollectionRepository.countCollectionsByCommercialAndDateRange(commercial, dateFrom, dateTo);
        } else {
            totalAmount = tontineCollectionRepository.sumAmountByDateRange(dateFrom, dateTo);
            totalMises = tontineCollectionRepository.countCollectionsByDateRange(dateFrom, dateTo);
        }

        return TontineCollectionKpiDto.builder()
                .totalMises(totalMises != null ? totalMises : 0L)
                .totalMontant(totalAmount != null ? totalAmount : 0.0)
                .build();
    }
}
