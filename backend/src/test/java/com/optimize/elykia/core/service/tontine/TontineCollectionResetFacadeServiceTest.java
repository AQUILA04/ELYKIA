package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.repository.TontineCollectionResetFileRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetRunRepository;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCollectionResetFacadeServiceTest {

    @Mock
    private TontineCollectionResetRunRepository runRepository;
    @Mock
    private TontineCollectionResetFileRepository fileRepository;
    @Mock
    private TontineCollectionResetService resetService;
    @Mock
    private MonthlyReportStorageService storageService;
    @InjectMocks
    private TontineCollectionResetFacadeService service;

    @Test
    void getArchiveTree_groupsRunsByDescendingSessionYearAndAttachesTheirFiles() {
        // Given
        TontineCollectionResetRun recentRun = run(10L, 2026, TontineCollectionResetRunStatus.COMPLETED);
        TontineCollectionResetRun oldRun = run(20L, 2025, TontineCollectionResetRunStatus.FAILED);
        TontineCollectionResetFile archive = archiveFile(101L, "collecte-com-a-t1.pdf", "commercial.a", "T1");
        when(runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(0, 200)))
                .thenReturn(new PageImpl<>(List.of(oldRun, recentRun)));
        when(fileRepository.findByRun_IdOrderByCommercialUsernameAscQuarterAsc(10L)).thenReturn(List.of(archive));
        when(fileRepository.findByRun_IdOrderByCommercialUsernameAscQuarterAsc(20L)).thenReturn(List.of());

        // When
        List<Map<String, Object>> tree = service.getArchiveTree();

        // Then
        assertEquals(List.of(2026, 2025), tree.stream().map(node -> node.get("year")).toList());
        Map<String, Object> recentRunNode = runsOf(tree.get(0)).get(0);
        assertEquals(10L, recentRunNode.get("runId"));
        assertEquals(TontineCollectionResetRunStatus.COMPLETED, recentRunNode.get("status"));
        assertEquals("admin", recentRunNode.get("triggeredBy"));
        Map<String, Object> archiveNode = filesOf(recentRunNode).get(0);
        assertEquals(101L, archiveNode.get("id"));
        assertEquals("collecte-com-a-t1.pdf", archiveNode.get("fileName"));
        assertEquals("commercial.a", archiveNode.get("commercialUsername"));
        assertEquals("T1", archiveNode.get("quarter"));
        verify(fileRepository).findByRun_IdOrderByCommercialUsernameAscQuarterAsc(10L);
        verify(fileRepository).findByRun_IdOrderByCommercialUsernameAscQuarterAsc(20L);
    }

    @Test
    void getFileForDownload_returnsArchivedFileNameAndStoredContent() {
        // Given
        TontineCollectionResetFile archive = archiveFile(101L, "collecte-com-a-t1.pdf", "commercial.a", "T1");
        archive.setStorageKey("tontine/reset/2026/collecte-com-a-t1.pdf");
        byte[] expectedContent = {1, 2, 3};
        when(fileRepository.findById(101L)).thenReturn(Optional.of(archive));
        when(storageService.download("tontine/reset/2026/collecte-com-a-t1.pdf")).thenReturn(expectedContent);

        // When
        TontineCollectionResetFacadeService.DownloadableFile download = service.getFileForDownload(101L);

        // Then
        assertEquals("collecte-com-a-t1.pdf", download.fileName());
        assertArrayEquals(expectedContent, download.content());
        verify(storageService).download("tontine/reset/2026/collecte-com-a-t1.pdf");
    }

    @Test
    void triggerMethods_delegateToResetServiceAndReturnItsRuns() {
        // Given
        TontineCollectionResetRunDto resetRun = mock(TontineCollectionResetRunDto.class);
        TontineCollectionResetRunDto exportRun = mock(TontineCollectionResetRunDto.class);
        when(resetService.triggerReset()).thenReturn(resetRun);
        when(resetService.triggerExportOnly()).thenReturn(exportRun);

        // When
        TontineCollectionResetRunDto resetResult = service.triggerReset();
        TontineCollectionResetRunDto exportResult = service.triggerExportOnly();

        // Then
        assertSame(resetRun, resetResult);
        assertSame(exportRun, exportResult);
        verify(resetService).triggerReset();
        verify(resetService).triggerExportOnly();
    }

    private TontineCollectionResetRun run(Long id, int sessionYear, TontineCollectionResetRunStatus status) {
        TontineCollectionResetRun run = new TontineCollectionResetRun();
        run.setId(id);
        run.setSessionYear(sessionYear);
        run.setStatus(status);
        run.setTriggeredBy("admin");
        run.setCollectionsCount(5);
        run.setCollectionsAmount(125_000.0);
        run.setMembersResetCount(2);
        return run;
    }

    private TontineCollectionResetFile archiveFile(Long id, String fileName, String commercial, String quarter) {
        TontineCollectionResetFile file = new TontineCollectionResetFile();
        file.setId(id);
        file.setFileName(fileName);
        file.setCommercialUsername(commercial);
        file.setQuarter(quarter);
        return file;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> runsOf(Map<String, Object> yearNode) {
        return (List<Map<String, Object>>) yearNode.get("runs");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> filesOf(Map<String, Object> runNode) {
        return (List<Map<String, Object>>) runNode.get("files");
    }
}
