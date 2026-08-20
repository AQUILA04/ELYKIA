package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.client.storage.ReportObjectKeyBuilder;
import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportPdfPersistenceServiceTest {

    @Mock
    private MonthlyReportRunRepository runRepository;
    @Mock
    private MonthlyReportFileRepository fileRepository;
    @Mock
    private MonthlyReportStorageService storageService;
    @Mock
    private MonthlyReportOutboxService outboxService;
    @Mock
    private ReportObjectKeyBuilder objectKeyBuilder;
    @InjectMocks
    private MonthlyReportPdfPersistenceService service;
    @Captor
    private ArgumentCaptor<MonthlyReportFile> fileCaptor;
    @Captor
    private ArgumentCaptor<String> localFilePathCaptor;

    @Test
    void persistOrQueuePdf_uploadsAvailableStorageAndPersistsFileMetadata() {
        // Given
        MonthlyReportRun run = run(2026, 8);
        byte[] content = new byte[]{1, 2, 3};
        when(runRepository.findById(100L)).thenReturn(Optional.of(run));
        when(objectKeyBuilder.buildGeneralFileName(2026, 8)).thenReturn("rapport-general-aout.pdf");
        when(storageService.isAvailable()).thenReturn(true);
        when(storageService.getReportsBucket()).thenReturn("monthly-reports");

        // When
        service.persistOrQueuePdf(100L, MonthlyReportFileType.GENERAL, null, "2026/08/general.pdf", content);

        // Then
        verify(storageService).upload("2026/08/general.pdf", content);
        verify(fileRepository).save(fileCaptor.capture());
        MonthlyReportFile file = fileCaptor.getValue();
        assertEquals(run, file.getRun());
        assertEquals(MonthlyReportFileType.GENERAL, file.getReportType());
        assertEquals("monthly-reports", file.getStorageBucket());
        assertEquals("2026/08/general.pdf", file.getStorageKey());
        assertEquals("rapport-general-aout.pdf", file.getFileName());
    }

    @Test
    void persistOrQueuePdf_queuesLocalFileWhenStorageIsUnavailable() throws Exception {
        // Given
        MonthlyReportRun run = run(2026, 8);
        byte[] content = new byte[]{9, 8, 7};
        when(runRepository.findById(101L)).thenReturn(Optional.of(run));
        when(objectKeyBuilder.buildCommercialFileName(2026, 8, "collector.a"))
                .thenReturn("rapport-collector-a.pdf");
        when(storageService.isAvailable()).thenReturn(false);
        when(storageService.getReportsBucket()).thenReturn("monthly-reports");

        // When
        service.persistOrQueuePdf(101L, MonthlyReportFileType.COMMERCIAL, "collector.a", "2026/08/collector-a.pdf", content);

        // Then
        verify(outboxService).enqueue(eq(run), eq(MonthlyReportFileType.COMMERCIAL), eq("collector.a"),
                eq("monthly-reports"), eq("2026/08/collector-a.pdf"), localFilePathCaptor.capture());
        Path temporaryPdf = Path.of(localFilePathCaptor.getValue());
        assertArrayEquals(content, Files.readAllBytes(temporaryPdf));
        Files.deleteIfExists(temporaryPdf);
    }

    private MonthlyReportRun run(int year, int month) {
        MonthlyReportRun run = new MonthlyReportRun();
        run.setYear(year);
        run.setMonth(month);
        return run;
    }
}
