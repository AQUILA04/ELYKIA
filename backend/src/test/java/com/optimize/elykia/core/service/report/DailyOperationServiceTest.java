package com.optimize.elykia.core.service.report;

import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.thymeleaf.TemplateEngine;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyOperationServiceTest {

    @Mock
    private DailyOperationLogRepository repository;
    @Mock
    private TemplateEngine templateEngine;
    @InjectMocks
    private DailyOperationService service;
    @Captor
    private ArgumentCaptor<DailyOperationLog> logCaptor;

    @Test
    void logOperation_persistsProvidedOperationDateAndNormalizesNullReliquats() {
        // Given
        LocalDate operationDate = LocalDate.of(2026, 8, 15);

        // When
        service.logOperation("collector.a", OperationType.CREDIT_COLLECTION, 150.0, "REC-15", "Encaissement",
                null, null, operationDate);

        // Then
        verify(repository).save(logCaptor.capture());
        DailyOperationLog saved = logCaptor.getValue();
        assertEquals(operationDate, saved.getDate());
        assertEquals("collector.a", saved.getCommercialUsername());
        assertEquals(OperationType.CREDIT_COLLECTION, saved.getType());
        assertEquals(150.0, saved.getAmount());
        assertEquals("REC-15", saved.getReference());
        assertEquals(0.0, saved.getReliquatGeneratedAmount());
        assertEquals(0.0, saved.getReliquatUsedAmount());
    }

    @Test
    void getOperations_routesCollectorRangeAndTypeToDedicatedRepositoryQuery() {
        // Given
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        Pageable pageable = PageRequest.of(0, 20);
        Page<DailyOperationLog> expected = new PageImpl<>(List.of(), pageable, 0);
        when(repository.findByDateBetweenAndCommercialUsernameAndType(
                start, end, "collector.a", OperationType.CASH_DEPOSIT, pageable)).thenReturn(expected);

        // When
        Page<DailyOperationLog> result = service.getOperations(
                start, end, "collector.a", OperationType.CASH_DEPOSIT, pageable);

        // Then
        assertSame(expected, result);
        verify(repository).findByDateBetweenAndCommercialUsernameAndType(
                start, end, "collector.a", OperationType.CASH_DEPOSIT, pageable);
    }

    @Test
    void getOperations_routesSingleDateCollectorWithoutTypeToDedicatedRepositoryQuery() {
        // Given
        LocalDate date = LocalDate.of(2026, 8, 15);
        Pageable pageable = PageRequest.of(1, 10);
        Page<DailyOperationLog> expected = new PageImpl<>(List.of(), pageable, 0);
        when(repository.findByDateAndCommercialUsername(date, "collector.a", pageable)).thenReturn(expected);

        // When
        Page<DailyOperationLog> result = service.getOperations(date, null, "collector.a", null, pageable);

        // Then
        assertSame(expected, result);
        verify(repository).findByDateAndCommercialUsername(date, "collector.a", pageable);
    }

    @Test
    void getOperations_returnsEmptyPageForInsufficientFilters() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);

        // When
        Page<DailyOperationLog> result = service.getOperations(null, null, "collector.a", null, pageable);

        // Then
        assertEquals(0, result.getTotalElements());
        assertEquals(0, result.getContent().size());
    }
}
