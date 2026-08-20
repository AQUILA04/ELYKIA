package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.dto.TontineCollectionKpiDto;
import com.optimize.elykia.core.dto.TontineCollectionWebDto;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCollectionWebServiceTest {

    private static final LocalDateTime DATE_FROM = LocalDateTime.of(2026, 1, 1, 0, 0);
    private static final LocalDateTime DATE_TO = LocalDateTime.of(2026, 1, 31, 23, 59);

    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @InjectMocks
    private TontineCollectionWebService service;

    @Test
    void getCollectionsForWeb_delegatesToCommercialQueryWhenCommercialIsProvided() {
        // Given
        Pageable pageable = PageRequest.of(1, 20);
        Page<TontineCollectionWebDto> expectedPage = Page.empty(pageable);
        when(tontineCollectionRepository.findWebDtosByCommercialAndDateRange(
                "commercial.a", DATE_FROM, DATE_TO, pageable)).thenReturn(expectedPage);

        // When
        Page<TontineCollectionWebDto> result = service.getCollectionsForWeb(
                DATE_FROM, DATE_TO, "commercial.a", pageable);

        // Then
        assertSame(expectedPage, result);
        verify(tontineCollectionRepository).findWebDtosByCommercialAndDateRange(
                "commercial.a", DATE_FROM, DATE_TO, pageable);
        verifyNoMoreInteractions(tontineCollectionRepository);
    }

    @Test
    void getCollectionsForWeb_delegatesToGlobalQueryWhenCommercialIsAll() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<TontineCollectionWebDto> expectedPage = Page.empty(pageable);
        when(tontineCollectionRepository.findWebDtosByDateRange(DATE_FROM, DATE_TO, pageable))
                .thenReturn(expectedPage);

        // When
        Page<TontineCollectionWebDto> result = service.getCollectionsForWeb(DATE_FROM, DATE_TO, "all", pageable);

        // Then
        assertSame(expectedPage, result);
        verify(tontineCollectionRepository).findWebDtosByDateRange(DATE_FROM, DATE_TO, pageable);
        verifyNoMoreInteractions(tontineCollectionRepository);
    }

    @Test
    void getKpiSummary_returnsCommercialAggregatesWhenCommercialIsProvided() {
        // Given
        when(tontineCollectionRepository.sumAmountByCommercialAndDateRange("commercial.a", DATE_FROM, DATE_TO))
                .thenReturn(125_000.0);
        when(tontineCollectionRepository.countCollectionsByCommercialAndDateRange("commercial.a", DATE_FROM, DATE_TO))
                .thenReturn(5L);
        when(tontineCollectionRepository.sumSocietyShareByCommercialAndDateRange("commercial.a", DATE_FROM, DATE_TO))
                .thenReturn(15_000.0);

        // When
        TontineCollectionKpiDto result = service.getKpiSummary(DATE_FROM, DATE_TO, "commercial.a");

        // Then
        assertEquals(5L, result.getTotalMises());
        assertEquals(125_000.0, result.getTotalMontant());
        assertEquals(15_000.0, result.getTotalSocietyShare());
        verify(tontineCollectionRepository).sumAmountByCommercialAndDateRange("commercial.a", DATE_FROM, DATE_TO);
        verify(tontineCollectionRepository).countCollectionsByCommercialAndDateRange("commercial.a", DATE_FROM, DATE_TO);
        verify(tontineCollectionRepository).sumSocietyShareByCommercialAndDateRange("commercial.a", DATE_FROM, DATE_TO);
        verifyNoMoreInteractions(tontineCollectionRepository);
    }

    @Test
    void getKpiSummary_normalizesMissingGlobalAggregatesToZero() {
        // Given
        when(tontineCollectionRepository.sumAmountByDateRange(DATE_FROM, DATE_TO)).thenReturn(null);
        when(tontineCollectionRepository.countCollectionsByDateRange(DATE_FROM, DATE_TO)).thenReturn(null);
        when(tontineCollectionRepository.sumSocietyShareByDateRange(DATE_FROM, DATE_TO)).thenReturn(null);

        // When
        TontineCollectionKpiDto result = service.getKpiSummary(DATE_FROM, DATE_TO, null);

        // Then
        assertEquals(0L, result.getTotalMises());
        assertEquals(0.0, result.getTotalMontant());
        assertEquals(0.0, result.getTotalSocietyShare());
        verify(tontineCollectionRepository).sumAmountByDateRange(DATE_FROM, DATE_TO);
        verify(tontineCollectionRepository).countCollectionsByDateRange(DATE_FROM, DATE_TO);
        verify(tontineCollectionRepository).sumSocietyShareByDateRange(DATE_FROM, DATE_TO);
        verifyNoMoreInteractions(tontineCollectionRepository);
    }
}
