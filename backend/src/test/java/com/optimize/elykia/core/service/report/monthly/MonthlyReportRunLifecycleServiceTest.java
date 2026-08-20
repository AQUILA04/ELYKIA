package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.entity.report.MonthlyReportSnapshot;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.enumaration.MonthlyReportRunStatus;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import com.optimize.elykia.core.repository.MonthlyReportSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportRunLifecycleServiceTest {

    @Mock
    private MonthlyReportRunRepository runRepository;
    @Mock
    private MonthlyReportSnapshotRepository snapshotRepository;
    @Mock
    private MonthlyReportOutboxEntryRepository outboxRepository;
    @Mock
    private MonthlyReportAggregationService aggregationService;
    @Mock
    private MonthlyReportRunCleanupService cleanupService;
    @InjectMocks
    private MonthlyReportRunLifecycleService service;
    @Captor
    private ArgumentCaptor<MonthlyReportSnapshot> snapshotCaptor;

    @Test
    void prepare_purgesExistingRunAggregatesRevenueAndCreatesSnapshot() {
        // Given
        MonthlyReportRun existingRun = new MonthlyReportRun();
        existingRun.setId(100L);
        Map<String, Object> generalSnapshot = Map.of("salesSummary", Map.of(
                "totalRevenue", 500_000.0,
                "totalPurchase", 300_000.0,
                "totalMargin", 200_000.0));
        when(runRepository.findByYearAndMonth(2026, 8)).thenReturn(Optional.of(existingRun));
        when(runRepository.save(any(MonthlyReportRun.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(aggregationService.aggregateGeneral(2026, 8)).thenReturn(generalSnapshot);
        when(aggregationService.listActiveCommercials(2026, 8)).thenReturn(List.of("collector.a", "collector.b"));

        // When
        MonthlyReportRunLifecycleService.PreparedRun result = service.prepare(2026, 8);

        // Then
        assertEquals(100L, result.runId());
        assertSame(generalSnapshot, result.generalSnapshot());
        assertEquals(List.of("collector.a", "collector.b"), result.activeCommercials());
        assertEquals(MonthlyReportRunStatus.GENERATING, existingRun.getStatus());
        assertEquals(500_000.0, existingRun.getTotalRevenueAmount());
        assertEquals(300_000.0, existingRun.getTotalPurchaseAmount());
        assertEquals(200_000.0, existingRun.getTotalMarginAmount());
        assertEquals(2, existingRun.getTotalCommercialCount());
        assertEquals(0, existingRun.getCompletedCommercialCount());
        verify(cleanupService).purgePreviousArtifacts(100L);
        verify(runRepository, times(3)).save(existingRun);
        verify(snapshotRepository).save(snapshotCaptor.capture());
        assertSame(existingRun, snapshotCaptor.getValue().getRun());
        assertSame(generalSnapshot, snapshotCaptor.getValue().getData());
    }

    @Test
    void finalizeRun_marksRunCompletedWithPendingWhenOutboxStillHasEntries() {
        // Given
        MonthlyReportRun run = new MonthlyReportRun();
        run.setId(101L);
        when(runRepository.findById(101L)).thenReturn(Optional.of(run));
        when(outboxRepository.countByRun_IdAndStatus(101L, MonthlyReportOutboxStatus.PENDING)).thenReturn(2L);
        when(runRepository.save(run)).thenReturn(run);

        // When
        MonthlyReportRun result = service.finalizeRun(101L);

        // Then
        assertSame(run, result);
        assertEquals(MonthlyReportRunStatus.COMPLETED_WITH_PENDING, result.getStatus());
        verify(runRepository).save(run);
    }

    @Test
    void finalizeRun_marksRunCompletedWhenOutboxHasNoPendingEntry() {
        // Given
        MonthlyReportRun run = new MonthlyReportRun();
        run.setId(102L);
        when(runRepository.findById(102L)).thenReturn(Optional.of(run));
        when(outboxRepository.countByRun_IdAndStatus(102L, MonthlyReportOutboxStatus.PENDING)).thenReturn(0L);
        when(runRepository.save(run)).thenReturn(run);

        // When
        MonthlyReportRun result = service.finalizeRun(102L);

        // Then
        assertEquals(MonthlyReportRunStatus.COMPLETED, result.getStatus());
        verify(runRepository).save(run);
    }
}
