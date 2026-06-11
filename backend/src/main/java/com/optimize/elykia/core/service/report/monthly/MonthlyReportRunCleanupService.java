package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import com.optimize.elykia.core.repository.MonthlyReportSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportRunCleanupService {

    private final MonthlyReportFileRepository fileRepository;
    private final MonthlyReportOutboxEntryRepository outboxRepository;
    private final MonthlyReportSnapshotRepository snapshotRepository;
    private final MonthlyReportStorageService storageService;

    public void purgePreviousArtifacts(Long runId) {
        log.info("Purge des artefacts existants pour le run mensuel id={}", runId);

        List<MonthlyReportFile> files = fileRepository.findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(runId);
        for (MonthlyReportFile file : files) {
            deleteStorageObjectQuietly(file.getStorageKey());
        }
        fileRepository.deleteByRun_Id(runId);

        List<MonthlyReportOutboxEntry> outboxEntries = outboxRepository.findByRun_Id(runId);
        for (MonthlyReportOutboxEntry entry : outboxEntries) {
            deleteLocalFileQuietly(entry.getLocalFilePath());
            deleteStorageObjectQuietly(entry.getStorageKey());
        }
        outboxRepository.deleteByRun_Id(runId);

        snapshotRepository.deleteByRun_Id(runId);

        log.info(
                "Purge terminée pour run id={}: {} fichier(s), {} outbox, snapshots supprimés",
                runId,
                files.size(),
                outboxEntries.size());
    }

    private void deleteStorageObjectQuietly(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            if (storageService.isAvailable()) {
                storageService.delete(storageKey);
            }
        } catch (Exception exception) {
            log.warn("Impossible de supprimer l'objet MinIO {}: {}", storageKey, exception.getMessage());
        }
    }

    private void deleteLocalFileQuietly(String localFilePath) {
        if (localFilePath == null || localFilePath.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(Path.of(localFilePath));
        } catch (Exception exception) {
            log.warn("Impossible de supprimer le fichier local {}: {}", localFilePath, exception.getMessage());
        }
    }
}
