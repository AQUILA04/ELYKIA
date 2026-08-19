package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportFacadeServiceTest {

    @Mock
    private MonthlyReportRunRepository runRepository;
    @Mock
    private MonthlyReportFileRepository fileRepository;
    @Mock
    private MonthlyReportStorageService storageService;
    @Mock
    private MonthlyReportJobOrchestrator orchestrator;
    @InjectMocks
    private MonthlyReportFacadeService service;

    @Test
    @SuppressWarnings("unchecked")
    void getTree_groupsFilesByYearAndMonthInDescendingChronologicalOrder() {
        // Given
        MonthlyReportRun olderRun = run(10L, 2025, 12);
        MonthlyReportRun newerRun = run(11L, 2026, 8);
        when(runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(0, 500)))
                .thenReturn(new PageImpl<>(List.of(newerRun, olderRun)));
        when(fileRepository.findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(11L))
                .thenReturn(List.of(file(21L, "general-2026-08.pdf")));
        when(fileRepository.findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(10L))
                .thenReturn(List.of(file(20L, "general-2025-12.pdf")));

        // When
        List<Map<String, Object>> tree = service.getTree();

        // Then
        assertEquals(List.of(2026, 2025), tree.stream().map(node -> (Integer) node.get("year")).toList());
        Map<Integer, List<Map<String, Object>>> months2026 =
                (Map<Integer, List<Map<String, Object>>>) tree.get(0).get("months");
        assertEquals("general-2026-08.pdf", months2026.get(8).get(0).get("fileName"));
        assertEquals(MonthlyReportFileType.GENERAL, months2026.get(8).get(0).get("reportType"));
    }

    @Test
    void getFileForDownload_readsStoredContentUsingFileStorageKey() {
        // Given
        MonthlyReportFile file = file(22L, "general.pdf");
        file.setStorageKey("2026/08/general.pdf");
        byte[] content = new byte[]{1, 2, 3};
        when(fileRepository.findById(22L)).thenReturn(Optional.of(file));
        when(storageService.download("2026/08/general.pdf")).thenReturn(content);

        // When
        MonthlyReportFacadeService.DownloadableFile result = service.getFileForDownload(22L);

        // Then
        assertEquals("general.pdf", result.fileName());
        assertSame(content, result.content());
        verify(storageService).download("2026/08/general.pdf");
    }

    @Test
    void triggerGenerateAndGetRuns_delegateToOrchestratorAndRunRepository() {
        // Given
        MonthlyReportRun run = run(30L, 2026, 8);
        Page<MonthlyReportRun> expectedRuns = new PageImpl<>(List.of(run), PageRequest.of(1, 10), 1);
        when(orchestrator.runMonthlyReport(2026, 8)).thenReturn(run);
        when(runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(1, 10))).thenReturn(expectedRuns);

        // When
        MonthlyReportRun generated = service.triggerGenerate(2026, 8);
        Page<MonthlyReportRun> runs = service.getRuns(1, 10);

        // Then
        assertSame(run, generated);
        assertSame(expectedRuns, runs);
        verify(orchestrator).runMonthlyReport(2026, 8);
        verify(runRepository).findAllByOrderByCreatedDateDesc(PageRequest.of(1, 10));
    }

    private MonthlyReportRun run(Long id, int year, int month) {
        MonthlyReportRun run = new MonthlyReportRun();
        run.setId(id);
        run.setYear(year);
        run.setMonth(month);
        return run;
    }

    private MonthlyReportFile file(Long id, String fileName) {
        MonthlyReportFile file = new MonthlyReportFile();
        file.setId(id);
        file.setReportType(MonthlyReportFileType.GENERAL);
        file.setFileName(fileName);
        return file;
    }
}
