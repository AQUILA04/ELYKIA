package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.CreditListSummaryDto;
import com.optimize.elykia.core.dto.CreditSearchDto;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditListSummaryServiceTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query query;

    @InjectMocks
    private CreditListSummaryService creditListSummaryService;

    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2026, 6, 1);
        endDate = LocalDate.of(2026, 6, 21);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
    }

    @Test
    void summarizeAggregatesClosedByTypeAndIgnoresStatusFilter() {
        when(query.getSingleResult())
                .thenReturn(new Object[]{2L, 200000.0, 50000.0})
                .thenReturn(new Object[]{1L, 50000.0, 10000.0})
                .thenReturn(new Object[]{0L, 0.0, 0.0})
                .thenReturn(new Object[]{3L, 300000.0, 70000.0, 120000.0})
                .thenReturn(new Object[]{10L, 80000.0});

        CreditSearchDto search = new CreditSearchDto(
                null,
                ClientType.CLIENT,
                OperationType.CREDIT,
                CreditStatus.INPROGRESS,
                "agent1",
                null
        );

        CreditListSummaryDto summary = creditListSummaryService.summarize(startDate, endDate, search);

        assertEquals(3L, summary.closedTotal().count());
        assertEquals(250000.0, summary.closedTotal().totalAmount());
        assertEquals(60000.0, summary.closedTotal().totalMargin());
        assertEquals(2L, summary.closedCredit().count());
        assertEquals(1L, summary.closedCash().count());
        assertEquals(3L, summary.inProgressCredit().count());
        assertEquals(120000.0, summary.inProgressCredit().totalAmountRemaining());
        assertEquals(10L, summary.collectedCount());
        assertEquals(80000.0, summary.collectedAmount());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, times(5)).createNativeQuery(sqlCaptor.capture());
        String closedSql = sqlCaptor.getAllValues().get(0);
        assertTrue(closedSql.contains("status = 'SETTLED'"));
        assertFalse(closedSql.contains("status = 'INPROGRESS'"));
    }

    @Test
    void summarizeReturnsEmptyWhenNoData() {
        when(query.getSingleResult())
                .thenReturn(new Object[]{0L, 0.0, 0.0})
                .thenReturn(new Object[]{0L, 0.0, 0.0})
                .thenReturn(new Object[]{0L, 0.0, 0.0})
                .thenReturn(new Object[]{0L, 0.0, 0.0, 0.0})
                .thenReturn(new Object[]{0L, 0.0});

        CreditListSummaryDto summary = creditListSummaryService.summarize(startDate, endDate, null);

        assertEquals(0L, summary.closedTotal().count());
        assertEquals(0.0, summary.closedTotal().totalMargin());
        assertEquals(0L, summary.inProgressCredit().count());
        assertEquals(0L, summary.collectedCount());
    }
}
