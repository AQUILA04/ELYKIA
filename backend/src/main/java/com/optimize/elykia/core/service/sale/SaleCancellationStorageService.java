package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.sale.SaleCancellationFile;
import com.optimize.elykia.core.entity.sale.SaleCancellationOutboxEntry;
import com.optimize.elykia.core.entity.sale.SaleCancellationRun;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.enumaration.SaleCancellationFileType;
import com.optimize.elykia.core.repository.SaleCancellationFileRepository;
import com.optimize.elykia.core.repository.SaleCancellationOutboxEntryRepository;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleCancellationStorageService {

    private final MonthlyReportStorageService minioStorageService;
    private final SaleCancellationFileRepository fileRepository;
    private final SaleCancellationOutboxEntryRepository outboxRepository;

    @Value("${app.cancellation.local-storage-path:./outbox/cancellations}")
    private String localStoragePath;

    public boolean isMinioAvailable() {
        return minioStorageService.isAvailable();
    }

    public SaleCancellationFile storeFile(
            SaleCancellationRun run,
            String fileName,
            SaleCancellationFileType fileType,
            byte[] content,
            Long creditId,
            String creditReference,
            String clientName,
            Double amount) {

        String storageBucket = minioStorageService.getReportsBucket();
        int year = run.getStartDate().getYear();
        int month = run.getStartDate().getMonthValue();
        String storageKey = String.format("cancellations/%d/%02d/run_%d/%s", year, month, run.getId(), fileName);

        boolean uploadedToMinio = false;
        if (minioStorageService.isAvailable()) {
            try {
                minioStorageService.upload(storageKey, content);
                uploadedToMinio = true;
                log.info("Fichier d'audit téléversé sur MinIO avec succès: {}", storageKey);
            } catch (Exception e) {
                log.warn("Échec upload MinIO pour {}, bascule en fallback local: {}", storageKey, e.getMessage());
            }
        } else {
            log.warn("MinIO indisponible, stockage local et mise en outbox pour {}", storageKey);
        }

        if (!uploadedToMinio) {
            saveLocalAndRecordOutbox(run, fileType, storageKey, fileName, content);
        }

        SaleCancellationFile fileRecord = new SaleCancellationFile();
        fileRecord.setRun(run);
        fileRecord.setFileName(fileName);
        fileRecord.setFileType(fileType);
        fileRecord.setStorageBucket(storageBucket);
        fileRecord.setStorageKey(storageKey);
        fileRecord.setCreditId(creditId);
        fileRecord.setCreditReference(creditReference);
        fileRecord.setClientName(clientName);
        fileRecord.setAmount(amount);

        return fileRepository.save(fileRecord);
    }

    private void saveLocalAndRecordOutbox(
            SaleCancellationRun run,
            SaleCancellationFileType fileType,
            String storageKey,
            String fileName,
            byte[] content) {
        try {
            File dir = new File(localStoragePath, "run_" + run.getId());
            if (!dir.exists()) {
                dir.mkdirs();
            }
            File localFile = new File(dir, fileName);
            try (FileOutputStream fos = new FileOutputStream(localFile)) {
                fos.write(content);
            }

            SaleCancellationOutboxEntry outbox = new SaleCancellationOutboxEntry();
            outbox.setRun(run);
            outbox.setFileType(fileType);
            outbox.setStorageKey(storageKey);
            outbox.setLocalFilePath(localFile.getAbsolutePath());
            outbox.setStatus(MonthlyReportOutboxStatus.PENDING);
            outbox.setRetryCount(0);
            outboxRepository.save(outbox);
            log.info("Fichier d'audit sauvegardé localement en outbox: {}", localFile.getAbsolutePath());
        } catch (Exception e) {
            log.error("Erreur critique lors de la sauvegarde locale outbox du fichier {}: {}", fileName, e.getMessage(), e);
            throw new RuntimeException("Impossible d'archiver le PDF d'audit localement : " + fileName, e);
        }
    }

    public byte[] downloadFile(SaleCancellationFile file) {
        // Tente de télécharger depuis MinIO en priorité
        if (minioStorageService.isAvailable()) {
            try {
                return minioStorageService.download(file.getStorageKey());
            } catch (Exception e) {
                log.warn("MinIO download échoué pour {}: {}", file.getStorageKey(), e.getMessage());
            }
        }

        // Fallback local filesystem si le fichier est encore en outbox locale
        try {
            File dir = new File(localStoragePath, "run_" + file.getRun().getId());
            File localFile = new File(dir, file.getFileName());
            if (localFile.exists()) {
                return Files.readAllBytes(localFile.toPath());
            }
        } catch (Exception e) {
            log.error("Erreur lors de la lecture du fallback local pour {}: {}", file.getFileName(), e.getMessage());
        }

        throw new RuntimeException("Fichier d'audit indisponible pour le moment (" + file.getFileName() + ")");
    }
}
