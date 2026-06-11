package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.entity.report.MonthlyReportFile;
import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.repository.MonthlyReportFileRepository;
import com.optimize.elykia.core.repository.MonthlyReportRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MonthlyReportFacadeService {

    private final MonthlyReportRunRepository runRepository;
    private final MonthlyReportFileRepository fileRepository;
    private final MonthlyReportStorageService storageService;
    private final MonthlyReportJobOrchestrator orchestrator;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTree() {
        List<MonthlyReportRun> runs = runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(0, 500)).getContent();
        Map<Integer, Map<Integer, List<Map<String, Object>>>> tree = new TreeMap<>(Comparator.reverseOrder());
        for (MonthlyReportRun run : runs) {
            List<MonthlyReportFile> files = fileRepository.findByRun_IdOrderByReportTypeAscCommercialUsernameAsc(run.getId());
            List<Map<String, Object>> fileDtos = files.stream().map(this::toFileDto).toList();
            tree.computeIfAbsent(run.getYear(), y -> new TreeMap<>(Comparator.reverseOrder()))
                    .put(run.getMonth(), fileDtos);
        }

        List<Map<String, Object>> response = new ArrayList<>();
        tree.forEach((year, months) -> response.add(Map.of("year", year, "months", months)));
        return response;
    }

    @Transactional(readOnly = true)
    public DownloadableFile getFileForDownload(Long fileId) {
        MonthlyReportFile file = fileRepository.findById(fileId).orElseThrow();
        return new DownloadableFile(file.getFileName(), storageService.download(file.getStorageKey()));
    }

    public record DownloadableFile(String fileName, byte[] content) {}

    public MonthlyReportRun triggerGenerate(Integer year, Integer month) {
        return orchestrator.runMonthlyReport(year, month);
    }

    @Transactional(readOnly = true)
    public Page<MonthlyReportRun> getRuns(int page, int size) {
        return runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(page, size));
    }

    private Map<String, Object> toFileDto(MonthlyReportFile file) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", file.getId());
        dto.put("reportType", file.getReportType());
        dto.put("fileName", file.getFileName());
        dto.put("commercialUsername", file.getCommercialUsername());
        dto.put("createdDate", file.getCreatedDate());
        return dto;
    }
}
