package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.sale.SaleCancellationOutboxEntry;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.repository.SaleCancellationOutboxEntryRepository;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SaleCancellationOutboxRetryScheduler {

    private static final int MAX_RETRIES = 5;

    private final MonthlyReportStorageService minioStorageService;
    private final SaleCancellationOutboxEntryRepository outboxRepository;

    @Scheduled(fixedDelay = 300_000) // toutes les 5 minutes
    public void retryPendingUploads() {
        if (!minioStorageService.isAvailable()) {
            return;
        }

        List<SaleCancellationOutboxEntry> entries = outboxRepository.findByStatusInAndRetryCountLessThan(
                List.of(MonthlyReportOutboxStatus.PENDING, MonthlyReportOutboxStatus.FAILED),
                MAX_RETRIES);

        if (entries.isEmpty()) {
            return;
        }

        log.info("Traitement de {} entrée(s) outbox d'annulation de vente en attente", entries.size());

        for (SaleCancellationOutboxEntry entry : entries) {
            try {
                entry.setStatus(MonthlyReportOutboxStatus.UPLOADING);
                entry.setLastAttemptAt(LocalDateTime.now());
                outboxRepository.save(entry);

                byte[] content = Files.readAllBytes(Path.of(entry.getLocalFilePath()));
                minioStorageService.upload(entry.getStorageKey(), content);

                entry.setStatus(MonthlyReportOutboxStatus.DONE);
                outboxRepository.save(entry);

                // Suppression propre du fichier local après upload réussi
                Files.deleteIfExists(Path.of(entry.getLocalFilePath()));
                log.info("Upload outbox réussi pour le fichier {}", entry.getStorageKey());
            } catch (Exception e) {
                log.error("Échec du retry outbox pour {}: {}", entry.getStorageKey(), e.getMessage());
                entry.setRetryCount(entry.getRetryCount() + 1);
                entry.setStatus(entry.getRetryCount() >= MAX_RETRIES ? MonthlyReportOutboxStatus.FAILED : MonthlyReportOutboxStatus.PENDING);
                entry.setErrorMessage(e.getMessage());
                outboxRepository.save(entry);
            }
        }
    }
}
