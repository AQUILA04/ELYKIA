package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportOutboxEntry;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportOutboxEntryRepository;
import com.optimize.elykia.core.repository.MonthlyReportSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportRunCleanupServiceTest {

    @Mock
    private MonthlyReportFileRepository fileRepository;
    @Mock
    private MonthlyReportOutboxEntryRepository outboxRepository;
    @Mock
    private MonthlyReportSnapshotRepository snapshotRepository;
    @Mock
    private MonthlyReportStorageService storageService;
    @InjectMocks
    private MonthlyReportRunCleanupService service;

    @Test
    void purgePreviousArtifacts_deletesRunFilesOutboxObjectsAndSnapshots() {
        // Given
        MonthlyReportFile reportFile = new MonthlyReportFile();
        reportFile.setStorageKey("2026/08/general.pdf");
        MonthlyReportOutboxEntry outboxEntry = new MonthlyReportOutboxEntry();
        outboxEntry.setStorageKey("2026/08/commercial-a.pdf");
        outboxEntry.setLocalFilePath(" ");
        when(fileRepository.findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(100L)).thenReturn(List.of(reportFile));
        when(outboxRepository.findByRun_Id(100L)).thenReturn(List.of(outboxEntry));
        when(storageService.isAvailable()).thenReturn(true);

        // When
        service.purgePreviousArtifacts(100L);

        // Then
        verify(storageService).delete("2026/08/general.pdf");
        verify(storageService).delete("2026/08/commercial-a.pdf");
        verify(fileRepository).deleteByRun_Id(100L);
        verify(outboxRepository).deleteByRun_Id(100L);
        verify(snapshotRepository).deleteByRun_Id(100L);
    }

    @Test
    void purgePreviousArtifacts_continuesRepositoryCleanupWhenStorageIsUnavailable() {
        // Given
        MonthlyReportFile reportFile = new MonthlyReportFile();
        reportFile.setStorageKey("2026/08/general.pdf");
        when(fileRepository.findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(101L)).thenReturn(List.of(reportFile));
        when(outboxRepository.findByRun_Id(101L)).thenReturn(List.of());
        when(storageService.isAvailable()).thenReturn(false);

        // When
        service.purgePreviousArtifacts(101L);

        // Then
        verify(fileRepository).deleteByRun_Id(101L);
        verify(outboxRepository).deleteByRun_Id(101L);
        verify(snapshotRepository).deleteByRun_Id(101L);
    }
}
