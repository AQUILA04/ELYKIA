package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.entity.report.MonthlyReportSnapshot;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.enumaration.MonthlyReportRunStatus;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import com.optimize.elykia.core.repository.MonthlyReportSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MonthlyReportRunLifecycleService {

    private final MonthlyReportRunRepository runRepository;
    private final MonthlyReportSnapshotRepository snapshotRepository;
    private final MonthlyReportOutboxEntryRepository outboxRepository;
    private final MonthlyReportAggregationService aggregationService;
    private final MonthlyReportRunCleanupService cleanupService;

    @Transactional
    public PreparedRun prepare(int year, int month) {
        MonthlyReportRun run = runRepository.findByYearAndMonth(year, month).orElseGet(MonthlyReportRun::new);
        if (run.getId() != null) {
            cleanupService.purgePreviousArtifacts(run.getId());
        }
        run.setYear(year);
        run.setMonth(month);
        run.setStatus(MonthlyReportRunStatus.AGGREGATING);
        run = runRepository.save(run);

        Map<String, Object> generalSnapshot = aggregationService.aggregateGeneral(year, month);
        run.setTotalRevenueAmount(toDouble(generalSnapshot, "salesSummary", "totalRevenue"));
        run.setTotalPurchaseAmount(toDouble(generalSnapshot, "salesSummary", "totalPurchase"));
        run.setTotalMarginAmount(toDouble(generalSnapshot, "salesSummary", "totalMargin"));
        run.setStatus(MonthlyReportRunStatus.GENERATING);
        run = runRepository.save(run);

        MonthlyReportSnapshot snapshot = new MonthlyReportSnapshot();
        snapshot.setRun(run);
        snapshot.setData(generalSnapshot);
        snapshotRepository.save(snapshot);

        List<String> activeCommercials = aggregationService.listActiveCommercials(year, month);
        run.setTotalCommercialCount(activeCommercials.size());
        run.setCompletedCommercialCount(0);
        runRepository.save(run);

        return new PreparedRun(run.getId(), generalSnapshot, activeCommercials);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateChunkProgress(Long runId, String cursor, int completedCount) {
        MonthlyReportRun run = runRepository.findById(runId).orElseThrow();
        run.setCurrentChunkCursor(cursor);
        run.setCompletedCommercialCount(completedCount);
        runRepository.save(run);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MonthlyReportRun finalizeRun(Long runId) {
        MonthlyReportRun run = runRepository.findById(runId).orElseThrow();
        long pending = outboxRepository.countByRun_IdAndStatus(runId, MonthlyReportOutboxStatus.PENDING);
        run.setStatus(pending > 0 ? MonthlyReportRunStatus.COMPLETED_WITH_PENDING : MonthlyReportRunStatus.COMPLETED);
        return runRepository.save(run);
    }

    @SuppressWarnings("unchecked")
    private double toDouble(Map<String, Object> root, String mapKey, String valueKey) {
        Object nested = root.get(mapKey);
        if (!(nested instanceof Map<?, ?> nestedMap)) {
            return 0.0;
        }
        Object value = ((Map<String, Object>) nestedMap).get(valueKey);
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        return 0.0;
    }

    public record PreparedRun(Long runId, Map<String, Object> generalSnapshot, List<String> activeCommercials) {}
}
