package com.optimize.elykia.core.controller.report;

import com.optimize.elykia.core.dto.report.CommercialYearlySummaryDto;
import com.optimize.elykia.core.dto.report.RemainingAtClientsPageDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.report.CommercialReportMonthlyService;
import com.optimize.elykia.core.service.report.DailyReportPdfService;
import com.optimize.elykia.core.service.report.RemainingAtClientsPdfService;
import com.optimize.elykia.core.service.report.RemainingAtClientsService;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/daily-commercial-reports")
@RequiredArgsConstructor
@Tag(name = "Daily Commercial Reports", description = "Endpoints for retrieving daily commercial reports and KPIs")
public class DailyReportController {

    private final DailyCommercialReportRepository repository;
    private final UserService userService;
    private final DailyReportPdfService dailyReportPdfService;
    private final CommercialReportMonthlyService commercialReportMonthlyService;
    private final RemainingAtClientsService remainingAtClientsService;
    private final RemainingAtClientsPdfService remainingAtClientsPdfService;

    @GetMapping
    @Operation(summary = "Get daily report for a specific commercial and date")
    public ResponseEntity<DailyCommercialReport> getReport(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("commercialUsername") String commercialUsername) {

        Optional<DailyCommercialReport> report = repository.findByDateAndCommercialUsername(date, commercialUsername);
        return report.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search reports with date range and role-based filtering")
    public ResponseEntity<List<DailyCommercialReport>> searchReports(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "collector", required = false) String collector) {

        User currentUser = userService.getCurrentUser();

        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return ResponseEntity.ok(repository.findAggregatedByDateBetweenAndCommercialUsername(
                    currentUser.getUsername(), startDate, endDate));
        } else {
            if (collector != null && !collector.isEmpty()) {
                return ResponseEntity.ok(repository.findAggregatedByDateBetweenAndCommercialUsername(
                        collector, startDate, endDate));
            } else {
                return ResponseEntity.ok(repository.findAggregatedByDateBetween(startDate, endDate));
            }
        }
    }

    @GetMapping("/yearly-summary")
    @Operation(summary = "Get yearly credit sales and deposit summary for a commercial")
    public ResponseEntity<CommercialYearlySummaryDto> getYearlySummary(
            @RequestParam("year") int year,
            @RequestParam(value = "collector", required = false) String collector) {

        String commercialUsername = resolveCommercialUsername(collector);
        if (commercialUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(commercialReportMonthlyService.getYearlySummary(commercialUsername, year));
    }

    @GetMapping("/yearly-remaining-credits")
    @Operation(summary = "Paginated list of credits still owed by clients for a commercial year")
    public ResponseEntity<RemainingAtClientsPageDto> getYearlyRemainingCredits(
            @RequestParam("year") int year,
            @RequestParam(value = "collector", required = false) String collector,
            @PageableDefault(size = 25) Pageable pageable) {

        String commercialUsername = resolveCommercialUsername(collector);
        if (commercialUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(remainingAtClientsService.getPage(commercialUsername, year, pageable));
    }

    @GetMapping("/yearly-remaining-credits/export/pdf")
    @Operation(summary = "Export remaining-at-clients credits as PDF for a commercial year")
    public ResponseEntity<byte[]> exportYearlyRemainingCreditsPdf(
            @RequestParam("year") int year,
            @RequestParam(value = "collector", required = false) String collector) {

        String commercialUsername = resolveCommercialUsername(collector);
        if (commercialUsername == null) {
            return ResponseEntity.badRequest().build();
        }

        byte[] pdfBytes = remainingAtClientsPdfService.generatePdf(commercialUsername, year);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=reste_chez_les_clients_" + commercialUsername + "_" + year + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/export/pdf")
    @Operation(summary = "Export daily report as PDF for a specific commercial and date range")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam("commercialUsername") String commercialUsername) {

        User currentUser = userService.getCurrentUser();
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            commercialUsername = currentUser.getUsername();
        }

        byte[] pdfBytes = dailyReportPdfService.generatePdfExport(startDate, endDate, commercialUsername);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=rapport_journalier_" + commercialUsername + "_" + startDate + "_" + endDate + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    private String resolveCommercialUsername(String collector) {
        User currentUser = userService.getCurrentUser();
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return currentUser.getUsername();
        }
        if (collector == null || collector.isEmpty()) {
            return null;
        }
        return collector;
    }
}
