package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportOutboxRetryScheduler {

    private static final int MAX_RETRIES = 5;

    private final MonthlyReportStorageService storageService;
    private final MonthlyReportOutboxEntryRepository outboxRepository;
    private final MonthlyReportOutboxService outboxService;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void retryPendingUploads() {
        log.info("Début retry outbox rapports mensuels");

        if (!storageService.isAvailable()) {
            log.info("MinIO indisponible, report du retry outbox rapports mensuels");
            return;
        }

        List<MonthlyReportOutboxEntry> entries = outboxRepository.findByStatusInAndRetryCountLessThan(
                List.of(MonthlyReportOutboxStatus.PENDING, MonthlyReportOutboxStatus.FAILED),
                MAX_RETRIES);

        if (entries.isEmpty()) {
            log.info("Aucune entrée outbox rapport mensuel en attente");
            return;
        }

        log.info("{} entrée(s) outbox rapport mensuel à traiter", entries.size());

        int successCount = 0;
        int failureCount = 0;

        for (MonthlyReportOutboxEntry entry : entries) {
            Long entryId = entry.getId();
            Long runId = entry.getRun() != null ? entry.getRun().getId() : null;
            try {
                entry.setStatus(MonthlyReportOutboxStatus.UPLOADING);
                outboxRepository.save(entry);

                log.debug(
                        "Upload outbox rapport mensuel: entryId={}, runId={}, type={}, key={}",
                        entryId,
                        runId,
                        entry.getFileType(),
                        entry.getStorageKey());

                byte[] content = Files.readAllBytes(Path.of(entry.getLocalFilePath()));
                storageService.upload(entry.getStorageKey(), content);
                outboxService.markDone(entry, extractFilename(entry.getStorageKey()));
                Files.deleteIfExists(Path.of(entry.getLocalFilePath()));

                successCount++;
                log.info(
                        "Rapport mensuel outbox traité avec succès: entryId={}, runId={}, type={}, key={}",
                        entryId,
                        runId,
                        entry.getFileType(),
                        entry.getStorageKey());
            } catch (Exception exception) {
                outboxService.markFailure(entry, exception, MAX_RETRIES);
                failureCount++;

                if (entry.getStatus() == MonthlyReportOutboxStatus.FAILED) {
                    log.error(
                            "Rapport mensuel outbox: abandon après {} tentatives. entryId={}, runId={}, key={}, path={}",
                            MAX_RETRIES,
                            entryId,
                            runId,
                            entry.getStorageKey(),
                            entry.getLocalFilePath(),
                            exception);
                } else {
                    log.warn(
                            "Rapport mensuel outbox: échec upload (tentative {}/{}). entryId={}, runId={}, key={}: {}",
                            entry.getRetryCount(),
                            MAX_RETRIES,
                            entryId,
                            runId,
                            entry.getStorageKey(),
                            exception.getMessage());
                }
            }
        }

        log.info(
                "Fin retry outbox rapports mensuels: {} traitée(s), {} succès, {} échec(s)",
                entries.size(),
                successCount,
                failureCount);
    }

    private String extractFilename(String storageKey) {
        int separator = storageKey.lastIndexOf('/');
        return separator >= 0 ? storageKey.substring(separator + 1) : storageKey;
    }
}
