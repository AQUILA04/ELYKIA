package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.repository.TontineCollectionResetFileRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetRunRepository;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TontineCollectionResetFacadeService {

    private final TontineCollectionResetRunRepository runRepository;
    private final TontineCollectionResetFileRepository fileRepository;
    private final TontineCollectionResetService resetService;
    private final MonthlyReportStorageService storageService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getArchiveTree() {
        List<TontineCollectionResetRun> runs = runRepository
                .findAllByOrderByCreatedDateDesc(PageRequest.of(0, 200))
                .getContent();

        Map<Integer, List<Map<String, Object>>> byYear = new TreeMap<>(Comparator.reverseOrder());
        for (TontineCollectionResetRun run : runs) {
            List<TontineCollectionResetFile> files = fileRepository
                    .findByRun_IdOrderByCommercialUsernameAscQuarterAsc(run.getId());
            List<Map<String, Object>> fileDtos = files.stream().map(this::toFileDto).toList();
            Map<String, Object> runNode = new LinkedHashMap<>();
            runNode.put("runId", run.getId());
            runNode.put("status", run.getStatus());
            runNode.put("triggeredBy", run.getTriggeredBy());
            runNode.put("createdDate", run.getCreatedDate());
            runNode.put("collectionsCount", run.getCollectionsCount());
            runNode.put("collectionsAmount", run.getCollectionsAmount());
            runNode.put("membersResetCount", run.getMembersResetCount());
            runNode.put("files", fileDtos);

            byYear.computeIfAbsent(run.getSessionYear(), y -> new ArrayList<>()).add(runNode);
        }

        List<Map<String, Object>> response = new ArrayList<>();
        byYear.forEach((year, runNodes) -> response.add(Map.of("year", year, "runs", runNodes)));
        return response;
    }

    @Transactional(readOnly = true)
    public DownloadableFile getFileForDownload(Long fileId) {
        TontineCollectionResetFile file = fileRepository.findById(fileId).orElseThrow();
        return new DownloadableFile(file.getFileName(), storageService.download(file.getStorageKey()));
    }

    public TontineCollectionResetRunDto triggerReset() {
        return resetService.triggerReset();
    }

    public TontineCollectionResetRunDto triggerExportOnly() {
        return resetService.triggerExportOnly();
    }

    @Transactional(readOnly = true)
    public Page<TontineCollectionResetRunDto> getRuns(int page, int size) {
        return runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(page, size))
                .map(TontineCollectionResetRunDto::from);
    }

    public record DownloadableFile(String fileName, byte[] content) {}

    private Map<String, Object> toFileDto(TontineCollectionResetFile file) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", file.getId());
        dto.put("fileName", file.getFileName());
        dto.put("commercialUsername", file.getCommercialUsername());
        dto.put("quarter", file.getQuarter());
        dto.put("createdDate", file.getCreatedDate());
        return dto;
    }
}
