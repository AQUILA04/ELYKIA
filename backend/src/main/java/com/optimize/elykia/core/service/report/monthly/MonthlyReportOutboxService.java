package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MonthlyReportOutboxService {

    private final MonthlyReportOutboxEntryRepository outboxRepository;
    private final MonthlyReportFileRepository fileRepository;

    @Transactional
    public MonthlyReportOutboxEntry enqueue(
            MonthlyReportRun run,
            MonthlyReportFileType fileType,
            String commercialUsername,
            String storageBucket,
            String storageKey,
            String localFilePath) {
        MonthlyReportOutboxEntry entry = new MonthlyReportOutboxEntry();
        entry.setRun(run);
        entry.setFileType(fileType);
        entry.setCommercialUsername(commercialUsername);
        entry.setStorageBucket(storageBucket);
        entry.setStorageKey(storageKey);
        entry.setLocalFilePath(localFilePath);
        entry.setStatus(MonthlyReportOutboxStatus.PENDING);
        return outboxRepository.save(entry);
    }

    @Transactional
    public void markDone(MonthlyReportOutboxEntry entry, String fileName) {
        entry.setStatus(MonthlyReportOutboxStatus.DONE);
        outboxRepository.save(entry);

        MonthlyReportFile file = new MonthlyReportFile();
        file.setRun(entry.getRun());
        file.setReportType(entry.getFileType());
        file.setCommercialUsername(entry.getCommercialUsername());
        file.setFileName(fileName);
        file.setStorageBucket(entry.getStorageBucket());
        file.setStorageKey(entry.getStorageKey());
        fileRepository.save(file);
    }

    @Transactional
    public void markFailure(MonthlyReportOutboxEntry entry, Exception exception, int maxRetryCount) {
        int retryCount = entry.getRetryCount() == null ? 0 : entry.getRetryCount();
        entry.setRetryCount(retryCount + 1);
        entry.setLastAttemptAt(LocalDateTime.now());
        entry.setErrorMessage(exception.getMessage());
        entry.setStatus(entry.getRetryCount() >= maxRetryCount
                ? MonthlyReportOutboxStatus.FAILED
                : MonthlyReportOutboxStatus.PENDING);
        outboxRepository.save(entry);
    }
}
