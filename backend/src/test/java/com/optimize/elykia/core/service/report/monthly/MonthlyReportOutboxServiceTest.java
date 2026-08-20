package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportOutboxServiceTest {

    @Mock
    private MonthlyReportOutboxEntryRepository outboxRepository;
    @Mock
    private MonthlyReportFileRepository fileRepository;
    @InjectMocks
    private MonthlyReportOutboxService service;
    @Captor
    private ArgumentCaptor<MonthlyReportOutboxEntry> entryCaptor;
    @Captor
    private ArgumentCaptor<MonthlyReportFile> fileCaptor;

    @Test
    void enqueue_createsPendingEntryWithStorageCoordinates() {
        // Given
        MonthlyReportRun run = new MonthlyReportRun();
        when(outboxRepository.save(any(MonthlyReportOutboxEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        MonthlyReportOutboxEntry result = service.enqueue(
                run, MonthlyReportFileType.COMMERCIAL, "collector.a", "reports", "2026/08/a.pdf", "/tmp/a.pdf");

        // Then
        assertEquals(MonthlyReportOutboxStatus.PENDING, result.getStatus());
        assertEquals(run, result.getRun());
        assertEquals(MonthlyReportFileType.COMMERCIAL, result.getFileType());
        assertEquals("collector.a", result.getCommercialUsername());
        assertEquals("reports", result.getStorageBucket());
        assertEquals("2026/08/a.pdf", result.getStorageKey());
        assertEquals("/tmp/a.pdf", result.getLocalFilePath());
        verify(outboxRepository).save(result);
    }

    @Test
    void markDone_marksEntryDoneAndPersistsCorrespondingReportFile() {
        // Given
        MonthlyReportRun run = new MonthlyReportRun();
        MonthlyReportOutboxEntry entry = new MonthlyReportOutboxEntry();
        entry.setRun(run);
        entry.setFileType(MonthlyReportFileType.GENERAL);
        entry.setCommercialUsername("collector.a");
        entry.setStorageBucket("reports");
        entry.setStorageKey("2026/08/general.pdf");

        // When
        service.markDone(entry, "general.pdf");

        // Then
        assertEquals(MonthlyReportOutboxStatus.DONE, entry.getStatus());
        verify(outboxRepository).save(entry);
        verify(fileRepository).save(fileCaptor.capture());
        MonthlyReportFile file = fileCaptor.getValue();
        assertEquals(run, file.getRun());
        assertEquals(MonthlyReportFileType.GENERAL, file.getReportType());
        assertEquals("collector.a", file.getCommercialUsername());
        assertEquals("general.pdf", file.getFileName());
        assertEquals("reports", file.getStorageBucket());
        assertEquals("2026/08/general.pdf", file.getStorageKey());
    }

    @Test
    void markFailure_requeuesBeforeLimitThenMarksFailureAtRetryLimit() {
        // Given
        MonthlyReportOutboxEntry pendingEntry = new MonthlyReportOutboxEntry();
        MonthlyReportOutboxEntry finalFailureEntry = new MonthlyReportOutboxEntry();
        finalFailureEntry.setRetryCount(1);

        // When
        service.markFailure(pendingEntry, new IllegalStateException("storage unavailable"), 2);
        service.markFailure(finalFailureEntry, new IllegalStateException("storage unavailable"), 2);

        // Then
        assertEquals(1, pendingEntry.getRetryCount());
        assertEquals(MonthlyReportOutboxStatus.PENDING, pendingEntry.getStatus());
        assertNotNull(pendingEntry.getLastAttemptAt());
        assertEquals("storage unavailable", pendingEntry.getErrorMessage());
        assertEquals(2, finalFailureEntry.getRetryCount());
        assertEquals(MonthlyReportOutboxStatus.FAILED, finalFailureEntry.getStatus());
        verify(outboxRepository).save(pendingEntry);
        verify(outboxRepository).save(finalFailureEntry);
    }
}
