package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.TontineCollectionResetLineDto;
import com.optimize.elykia.core.dto.TontineCollectionResetMemberDto;
import com.optimize.elykia.core.dto.TontineCollectionResetReportDayDto;
import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.dto.TontineCommercialVoidPreviewDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import com.optimize.elykia.core.entity.report.TontineCollectionResetLine;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.enumaration.TontineCollectionResetScope;
import com.optimize.elykia.core.repository.TontineCollectionResetFileRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetLineRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetMemberRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetReportDayRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetRunRepository;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TontineCollectionResetFacadeService {

    private static final DateTimeFormatter CSV_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final TontineCollectionResetRunRepository runRepository;
    private final TontineCollectionResetFileRepository fileRepository;
    private final TontineCollectionResetLineRepository lineRepository;
    private final TontineCollectionResetMemberRepository memberRepository;
    private final TontineCollectionResetReportDayRepository reportDayRepository;
    private final TontineCollectionResetService resetService;
    private final TontineCommercialCollectionVoidService commercialVoidService;
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
            runNode.put("scope", run.getScope() != null ? run.getScope() : TontineCollectionResetScope.SESSION);
            runNode.put("targetCommercialUsername", run.getTargetCommercialUsername());
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
    public TontineCommercialVoidPreviewDto previewCommercial(String commercialUsername, Integer sessionYear) {
        return commercialVoidService.preview(commercialUsername, sessionYear);
    }

    public TontineCollectionResetRunDto voidCommercial(String commercialUsername, Integer sessionYear) {
        return commercialVoidService.voidCommercial(commercialUsername, sessionYear);
    }

    @Transactional(readOnly = true)
    public Page<TontineCollectionResetLineDto> getLines(Long runId, int page, int size) {
        requireRun(runId);
        return lineRepository
                .findByRun_IdOrderByCollectionDateAscIdAsc(runId, PageRequest.of(page, safeSize(size)))
                .map(TontineCollectionResetLineDto::from);
    }

    @Transactional(readOnly = true)
    public Page<TontineCollectionResetMemberDto> getMembers(Long runId, int page, int size) {
        requireRun(runId);
        return memberRepository
                .findByRun_IdOrderByClientNameAscIdAsc(runId, PageRequest.of(page, safeSize(size)))
                .map(TontineCollectionResetMemberDto::from);
    }

    @Transactional(readOnly = true)
    public List<TontineCollectionResetReportDayDto> getReportDays(Long runId) {
        requireRun(runId);
        return reportDayRepository.findByRun_IdOrderByReportDateAscIdAsc(runId).stream()
                .map(TontineCollectionResetReportDayDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public byte[] exportLinesCsv(Long runId) {
        TontineCollectionResetRun run = requireRun(runId);
        List<TontineCollectionResetLine> lines = lineRepository
                .findByRun_IdOrderByQuarterAscCollectionDateAscIdAsc(runId);
        StringBuilder csv = new StringBuilder();
        csv.append('\uFEFF');
        csv.append("Client;Code;Quartier;Date;Montant;Reference;Livraison;Part societe;Commercial\n");
        for (TontineCollectionResetLine line : lines) {
            csv.append(csvCell(line.getClientName())).append(';')
                    .append(csvCell(line.getClientCode())).append(';')
                    .append(csvCell(line.getQuarter())).append(';')
                    .append(line.getCollectionDate() != null ? CSV_DATE.format(line.getCollectionDate()) : "").append(';')
                    .append(line.getAmount() != null ? line.getAmount() : 0).append(';')
                    .append(csvCell(line.getReference())).append(';')
                    .append(Boolean.TRUE.equals(line.getDeliveryCollection()) ? "Oui" : "Non").append(';')
                    .append(line.getSocietyShareAmount() != null ? line.getSocietyShareAmount() : 0).append(';')
                    .append(csvCell(run.getTargetCommercialUsername()))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public Page<TontineCollectionResetRunDto> getRuns(int page, int size) {
        return runRepository.findAllByOrderByCreatedDateDesc(PageRequest.of(page, size))
                .map(TontineCollectionResetRunDto::from);
    }

    public record DownloadableFile(String fileName, byte[] content) {}

    private TontineCollectionResetRun requireRun(Long runId) {
        return runRepository.findById(runId)
                .orElseThrow(() -> new CustomValidationException("Archive introuvable."));
    }

    private static int safeSize(int size) {
        if (size < 1) {
            return 20;
        }
        return Math.min(size, 100);
    }

    private static String csvCell(String value) {
        if (value == null) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(";") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

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
