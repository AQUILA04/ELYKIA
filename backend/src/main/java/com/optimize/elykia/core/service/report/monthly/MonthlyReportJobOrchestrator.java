package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.client.storage.ReportObjectKeyBuilder;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Service
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportJobOrchestrator {

    private final MonthlyReportRunLifecycleService lifecycleService;
    private final CommercialMonthlyStockCloseExecutor stockCloseExecutor;
    private final MonthlyReportPdfPersistenceService pdfPersistenceService;
    private final MonthlyReportAggregationService aggregationService;
    private final CommercialStockTraceabilityService traceabilityService;
    private final MonthlyReportPdfService pdfService;
    private final ReportObjectKeyBuilder objectKeyBuilder;

    public MonthlyReportRun runMonthlyReport(int year, int month) {
        MonthlyReportRunLifecycleService.PreparedRun prepared = lifecycleService.prepare(year, month);
        stockCloseExecutor.closeAllCurrentMonthStocksSafely();
        Long runId = prepared.runId();

        String generalKey = objectKeyBuilder.buildGeneralKey(year, month);
        byte[] generalPdf = pdfService.generateGeneralPdf(prepared.generalSnapshot());
        pdfPersistenceService.persistOrQueuePdf(runId, MonthlyReportFileType.GENERAL, null, generalKey, generalPdf);

        generateCommercialReportsInChunks(runId, year, month, prepared.activeCommercials());
        return lifecycleService.finalizeRun(runId);
    }

    private void generateCommercialReportsInChunks(Long runId, int year, int month, List<String> commercials) {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        int chunkSize = 5;
        int completed = 0;

        try {
            for (int i = 0; i < commercials.size(); i += chunkSize) {
                int end = Math.min(i + chunkSize, commercials.size());
                List<String> chunk = commercials.subList(i, end);
                lifecycleService.updateChunkProgress(runId, "chunk-" + i, completed);

                List<Future<?>> futures = new java.util.ArrayList<>();
                for (String commercial : chunk) {
                    futures.add(pool.submit(() -> {
                        Map<String, Object> snapshot = aggregationService.aggregateCommercial(year, month, commercial);
                        List<Map<String, Object>> timeline = traceabilityService.buildTimeline(commercial, year, month);
                        byte[] pdf = pdfService.generateCommercialPdf(snapshot, timeline);
                        String key = objectKeyBuilder.buildCommercialKey(year, month, commercial);
                        pdfPersistenceService.persistOrQueuePdf(
                                runId, MonthlyReportFileType.COMMERCIAL, commercial, key, pdf);
                    }));
                }
                for (Future<?> future : futures) {
                    try {
                        future.get();
                        completed++;
                    } catch (Exception e) {
                        log.error("Erreur lors de la génération du chunk commercial", e);
                    }
                }
                lifecycleService.updateChunkProgress(runId, "chunk-" + end, completed);
            }
        } finally {
            pool.shutdown();
            while (!pool.isTerminated()) {
                Thread.yield();
            }
        }
    }
}
