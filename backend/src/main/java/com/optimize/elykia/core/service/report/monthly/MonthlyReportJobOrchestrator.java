package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.client.storage.ReportObjectKeyBuilder;
import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.entity.report.MonthlyReportSnapshot;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.enumaration.MonthlyReportRunStatus;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import com.optimize.elykia.core.repository.MonthlyReportSnapshotRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Service
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportJobOrchestrator {

    private final MonthlyReportRunRepository runRepository;
    private final MonthlyReportSnapshotRepository snapshotRepository;
    private final MonthlyReportFileRepository fileRepository;
    private final MonthlyReportOutboxEntryRepository outboxRepository;
    private final MonthlyReportAggregationService aggregationService;
    private final CommercialStockTraceabilityService traceabilityService;
    private final MonthlyReportPdfService pdfService;
    private final MonthlyReportStorageService storageService;
    private final MonthlyReportOutboxService outboxService;
    private final ReportObjectKeyBuilder objectKeyBuilder;
    private final CommercialMonthlyStockService monthlyStockService;

    @Transactional
    public MonthlyReportRun runMonthlyReport(int year, int month) {
        MonthlyReportRun run = runRepository.findByYearAndMonth(year, month).orElseGet(MonthlyReportRun::new);
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

        closeCurrentMonthStockSafely();
        generateAndStoreGeneralPdf(run, generalSnapshot);

        List<String> activeCommercials = aggregationService.listActiveCommercials(year, month);
        run.setTotalCommercialCount(activeCommercials.size());
        runRepository.save(run);

        generateCommercialReportsInChunks(run, year, month, activeCommercials);
        return finalizeRun(run.getId());
    }

    private void generateCommercialReportsInChunks(MonthlyReportRun run, int year, int month, List<String> commercials) {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        int chunkSize = 5;
        int completed = 0;

        for (int i = 0; i < commercials.size(); i += chunkSize) {
            int end = Math.min(i + chunkSize, commercials.size());
            List<String> chunk = commercials.subList(i, end);
            run.setCurrentChunkCursor("chunk-" + i);
            runRepository.save(run);

            List<Future<?>> futures = new java.util.ArrayList<>();
            for (String commercial : chunk) {
                futures.add(pool.submit(() -> {
                    Map<String, Object> snapshot = aggregationService.aggregateCommercial(year, month, commercial);
                    List<Map<String, Object>> timeline = traceabilityService.buildTimeline(commercial, year, month);
                    byte[] pdf = pdfService.generateCommercialPdf(snapshot, timeline);
                    String key = objectKeyBuilder.buildCommercialKey(year, month, commercial);
                    persistOrQueuePdf(run, MonthlyReportFileType.COMMERCIAL, commercial, key, pdf);
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
            run.setCompletedCommercialCount(completed);
            runRepository.save(run);
        }

        pool.shutdown();
        while (!pool.isTerminated()) {
            Thread.yield();
        }
    }

    private void generateAndStoreGeneralPdf(MonthlyReportRun run, Map<String, Object> generalSnapshot) {
        byte[] generalPdf = pdfService.generateGeneralPdf(generalSnapshot);
        String generalKey = objectKeyBuilder.buildGeneralKey(run.getYear(), run.getMonth());
        persistOrQueuePdf(run, MonthlyReportFileType.GENERAL, null, generalKey, generalPdf);
    }

    @Transactional
    protected void persistOrQueuePdf(
            MonthlyReportRun run,
            MonthlyReportFileType fileType,
            String commercialUsername,
            String objectKey,
            byte[] content) {
        try {
            if (storageService.isAvailable()) {
                storageService.upload(objectKey, content);
                MonthlyReportFile file = new MonthlyReportFile();
                file.setRun(run);
                file.setReportType(fileType);
                file.setCommercialUsername(commercialUsername);
                file.setStorageBucket(storageService.getReportsBucket());
                file.setStorageKey(objectKey);
                file.setFileName(extractFilename(objectKey));
                fileRepository.save(file);
                return;
            }

            Path temp = Files.createTempFile("monthly-report-", ".pdf");
            Files.write(temp, content);
            outboxService.enqueue(
                    run, fileType, commercialUsername, storageService.getReportsBucket(), objectKey, temp.toString());
        } catch (Exception e) {
            log.error("Erreur génération stockage rapport mensuel", e);
            throw new RuntimeException(e);
        }
    }

    @Transactional
    protected MonthlyReportRun finalizeRun(Long runId) {
        MonthlyReportRun run = runRepository.findById(runId).orElseThrow();
        long pending = outboxRepository.countByRun_IdAndStatus(runId, MonthlyReportOutboxStatus.PENDING);
        run.setStatus(pending > 0 ? MonthlyReportRunStatus.COMPLETED_WITH_PENDING : MonthlyReportRunStatus.COMPLETED);
        return runRepository.save(run);
    }

    private void closeCurrentMonthStockSafely() {
        try {
            aggregationService.listActiveCommercials(
                    java.time.LocalDate.now().getYear(),
                    java.time.LocalDate.now().getMonthValue())
                    .forEach(username -> {
                        try {
                            monthlyStockService.closeCurrentMonthStock(username);
                        } catch (Exception ignored) {
                            // Ignore fermeture déjà effectuée/inexistante
                        }
                    });
        } catch (Exception exception) {
            log.warn("Impossible de clôturer certains stocks mensuels: {}", exception.getMessage());
        }
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

    private String extractFilename(String storageKey) {
        int separator = storageKey.lastIndexOf('/');
        return separator >= 0 ? storageKey.substring(separator + 1) : storageKey;
    }
}
