package com.optimize.elykia.core.service.commercial;

import com.optimize.elykia.core.dto.CommercialDataSummaryDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialDataSummaryServiceTest {

    @Mock
    private EntityManager entityManager;
    @Mock
    private Query query;

    private CommercialDataSummaryService service;

    @BeforeEach
    void setUp() {
        service = new CommercialDataSummaryService();
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
    }

    @Test
    void generateSummary_aggregatesEveryOperationalCounterForCommercial() {
        // Given
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getSingleResult()).thenReturn(
                1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L, 11L, 12L);

        // When
        CommercialDataSummaryDto result = service.generateSummary("commercial.a");

        // Then
        assertEquals("commercial.a", result.getCommercialUsername());
        assertNotNull(result.getGeneratedAt());
        assertEquals(1L, result.getTotalClients());
        assertEquals(2L, result.getTotalDistributions());
        assertEquals(3L, result.getTotalRecoveries());
        assertEquals(4L, result.getTotalTontineMembers());
        assertEquals(5L, result.getTotalTontineCollections());
        assertEquals(6L, result.getTotalTontineDeliveries());
        assertEquals(7L, result.getTotalArticles());
        assertEquals(8L, result.getTotalLocalities());
        assertEquals(0L, result.getTotalStockOutputs());
        assertEquals(0L, result.getTotalAccounts());
        assertEquals(9L, result.getTotalTontineStockItems());
        assertEquals(10L, result.getTotalTontineStockAvailable());
        assertEquals(11L, result.getTotalCommercialStockItems());
        assertEquals(12L, result.getTotalCommercialStockRemaining());
    }

    @Test
    void generateSummary_wrapsPersistenceFailureWithStableBusinessMessage() {
        // Given
        when(entityManager.createNativeQuery(anyString())).thenThrow(new IllegalStateException("database unavailable"));

        // When / Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.generateSummary("commercial.a"));
        assertEquals("Failed to generate data summary", exception.getMessage());
        assertEquals("database unavailable", exception.getCause().getMessage());
    }
}
