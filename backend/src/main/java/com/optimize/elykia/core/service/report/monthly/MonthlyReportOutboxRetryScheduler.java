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
        if (!storageService.isAvailable()) {
            log.debug("MinIO indisponible, report des uploads outbox mensuels");
            return;
        }

        List<MonthlyReportOutboxEntry> entries = outboxRepository.findByStatusInAndRetryCountLessThan(
                List.of(MonthlyReportOutboxStatus.PENDING, MonthlyReportOutboxStatus.FAILED),
                MAX_RETRIES);

        for (MonthlyReportOutboxEntry entry : entries) {
            try {
                entry.setStatus(MonthlyReportOutboxStatus.UPLOADING);
                outboxRepository.save(entry);

                byte[] content = Files.readAllBytes(Path.of(entry.getLocalFilePath()));
                storageService.upload(entry.getStorageKey(), content);
                outboxService.markDone(entry, extractFilename(entry.getStorageKey()));
                Files.deleteIfExists(Path.of(entry.getLocalFilePath()));
            } catch (Exception exception) {
                outboxService.markFailure(entry, exception, MAX_RETRIES);
            }
        }
    }

    private String extractFilename(String storageKey) {
        int separator = storageKey.lastIndexOf('/');
        return separator >= 0 ? storageKey.substring(separator + 1) : storageKey;
    }
}
