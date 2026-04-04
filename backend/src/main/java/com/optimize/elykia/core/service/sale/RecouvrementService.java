package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.RecouvrementKpiDto;
import com.optimize.elykia.core.dto.RecouvrementWebDto;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecouvrementService {

    private final CreditTimelineRepository timelineRepository;

    public Page<RecouvrementWebDto> getRecouvrements(LocalDate dateFrom, LocalDate dateTo, String collector, Pageable pageable) {
        LocalDateTime start = dateFrom.atStartOfDay();
        LocalDateTime end = dateTo.atTime(LocalTime.MAX);

        if (collector == null || collector.trim().isEmpty() || "all".equalsIgnoreCase(collector)) {
            return timelineRepository.findWebDtosByDateRange(start, end, pageable);
        } else {
            return timelineRepository.findWebDtosByCollectorAndDateRange(collector, start, end, pageable);
        }
    }

    @Transactional(readOnly = true)
    public RecouvrementKpiDto getRecouvrementSummary(LocalDate dateFrom, LocalDate dateTo, String collector) {
        LocalDateTime start = dateFrom.atStartOfDay();
        LocalDateTime end = dateTo.atTime(LocalTime.MAX);

        Double totalMontant;
        Long totalMises;

        if (collector == null || collector.trim().isEmpty() || "all".equalsIgnoreCase(collector)) {
            totalMontant = timelineRepository.sumAmountByCreatedDateBetween(start, end);
            totalMises = timelineRepository.findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(start, end).count();
        } else {
            totalMontant = timelineRepository.sumAmountByCollectorAndCreatedDateBetween(collector, start, end);
            totalMises = timelineRepository.findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(collector, start, end).count();
        }

        return RecouvrementKpiDto.builder()
                .totalMontant(totalMontant != null ? totalMontant : 0.0)
                .totalMises(totalMises != null ? totalMises : 0L)
                .build();
    }
}
