package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.RecouvrementKpiDto;
import com.optimize.elykia.core.dto.RecouvrementWebDto;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecouvrementServiceTest {

    private static final LocalDate DATE_FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate DATE_TO = LocalDate.of(2026, 8, 31);
    private static final LocalDateTime START = DATE_FROM.atStartOfDay();
    private static final LocalDateTime END = DATE_TO.atTime(LocalTime.MAX);

    @Mock
    private CreditTimelineRepository timelineRepository;
    @InjectMocks
    private RecouvrementService service;

    @Test
    void getRecouvrements_usesGlobalQueryForAllCollector() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<RecouvrementWebDto> expectedPage = Page.empty(pageable);
        when(timelineRepository.findWebDtosByDateRange(START, END, pageable)).thenReturn(expectedPage);

        // When
        Page<RecouvrementWebDto> result = service.getRecouvrements(DATE_FROM, DATE_TO, "all", pageable);

        // Then
        assertSame(expectedPage, result);
        verify(timelineRepository).findWebDtosByDateRange(START, END, pageable);
    }

    @Test
    void getRecouvrements_usesCollectorQueryWhenCollectorIsSpecified() {
        // Given
        Pageable pageable = PageRequest.of(1, 10);
        Page<RecouvrementWebDto> expectedPage = Page.empty(pageable);
        when(timelineRepository.findWebDtosByCollectorAndDateRange("collector.a", START, END, pageable))
                .thenReturn(expectedPage);

        // When
        Page<RecouvrementWebDto> result = service.getRecouvrements(DATE_FROM, DATE_TO, "collector.a", pageable);

        // Then
        assertSame(expectedPage, result);
        verify(timelineRepository).findWebDtosByCollectorAndDateRange("collector.a", START, END, pageable);
    }

    @Test
    void getRecouvrementSummary_normalizesEmptyGlobalAggregatesToZero() {
        // Given
        when(timelineRepository.sumAmountByCreatedDateBetween(START, END)).thenReturn(null);
        when(timelineRepository.findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqualAndState(START, END, State.ENABLED))
                .thenReturn(Stream.empty());

        // When
        RecouvrementKpiDto result = service.getRecouvrementSummary(DATE_FROM, DATE_TO, " ");

        // Then
        assertEquals(0.0, result.getTotalMontant());
        assertEquals(0L, result.getTotalMises());
        verify(timelineRepository).sumAmountByCreatedDateBetween(START, END);
    }

    @Test
    void getRecouvrementSummary_returnsCollectorAggregates() {
        // Given
        when(timelineRepository.sumAmountByCollectorAndCreatedDateBetween("collector.a", START, END))
                .thenReturn(175_000.0);
        when(timelineRepository.findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqualAndState(
                "collector.a", START, END, State.ENABLED)).thenReturn(Stream.of(new CreditTimeline(), new CreditTimeline()));

        // When
        RecouvrementKpiDto result = service.getRecouvrementSummary(DATE_FROM, DATE_TO, "collector.a");

        // Then
        assertEquals(175_000.0, result.getTotalMontant());
        assertEquals(2L, result.getTotalMises());
        verify(timelineRepository).sumAmountByCollectorAndCreatedDateBetween("collector.a", START, END);
    }
}
