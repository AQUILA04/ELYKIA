package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.client.storage.ReportObjectKeyBuilder;
import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportPdfPersistenceService {

    private final MonthlyReportRunRepository runRepository;
    private final MonthlyReportFileRepository fileRepository;
    private final MonthlyReportStorageService storageService;
    private final MonthlyReportOutboxService outboxService;
    private final ReportObjectKeyBuilder objectKeyBuilder;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persistOrQueuePdf(
            Long runId,
            MonthlyReportFileType fileType,
            String commercialUsername,
            String objectKey,
            byte[] content) {
        MonthlyReportRun run = runRepository.findById(runId).orElseThrow();
        String fileName = resolveFileName(run, fileType, commercialUsername, objectKey);
        try {
            if (storageService.isAvailable()) {
                storageService.upload(objectKey, content);
                MonthlyReportFile file = new MonthlyReportFile();
                file.setRun(run);
                file.setReportType(fileType);
                file.setCommercialUsername(commercialUsername);
                file.setStorageBucket(storageService.getReportsBucket());
                file.setStorageKey(objectKey);
                file.setFileName(fileName);
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

    private String resolveFileName(
            MonthlyReportRun run,
            MonthlyReportFileType fileType,
            String commercialUsername,
            String objectKey) {
        if (fileType == MonthlyReportFileType.GENERAL) {
            return objectKeyBuilder.buildGeneralFileName(run.getYear(), run.getMonth());
        }
        if (commercialUsername != null) {
            return objectKeyBuilder.buildCommercialFileName(run.getYear(), run.getMonth(), commercialUsername);
        }
        int separator = objectKey.lastIndexOf('/');
        return separator >= 0 ? objectKey.substring(separator + 1) : objectKey;
    }
}
