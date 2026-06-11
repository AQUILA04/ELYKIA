package com.optimize.elykia.core.controller.report;

import com.optimize.elykia.core.entity.report.MonthlyReportRun;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportFacadeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/monthly-reports")
@RequiredArgsConstructor
public class MonthlyReportController {

    private final MonthlyReportFacadeService facadeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_REPORT')")
    public ResponseEntity<List<Map<String, Object>>> getTree() {
        return ResponseEntity.ok(facadeService.getTree());
    }

    @GetMapping("/{fileId}/download")
    @PreAuthorize("hasAnyRole('ROLE_REPORT')")
    public ResponseEntity<byte[]> download(@PathVariable Long fileId) {
        var file = facadeService.getFileForDownload(fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.fileName() + "\"")
                .body(file.content());
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ROLE_REPORT')")
    public ResponseEntity<MonthlyReportRun> generate(@RequestBody(required = false) GenerateMonthlyReportRequest request) {
        LocalDate target = LocalDate.now().minusMonths(1);
        int year = request != null && request.year != null ? request.year : target.getYear();
        int month = request != null && request.month != null ? request.month : target.getMonthValue();
        return ResponseEntity.ok(facadeService.triggerGenerate(year, month));
    }

    @GetMapping("/runs")
    @PreAuthorize("hasAnyRole('ROLE_REPORT')")
    public ResponseEntity<Page<MonthlyReportRun>> getRuns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(facadeService.getRuns(page, size));
    }

    public static class GenerateMonthlyReportRequest {
        public Integer year;
        public Integer month;
    }
}
