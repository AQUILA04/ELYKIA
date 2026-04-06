package com.optimize.elykia.core.controller.report;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserProfilConstant;

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
            // Force collector to current user for promoters and return aggregated data
            return ResponseEntity.ok(repository.findAggregatedByDateBetweenAndCommercialUsername(
                    currentUser.getUsername(), startDate, endDate));
        } else {
            // Admin/Manager logic
            if (collector != null && !collector.isEmpty()) {
                // If collector is specified, return aggregated data for that collector
                return ResponseEntity.ok(repository.findAggregatedByDateBetweenAndCommercialUsername(
                        collector, startDate, endDate));
            } else {
                // Return aggregated data per commercial
                return ResponseEntity.ok(repository.findAggregatedByDateBetween(startDate, endDate));
            }
        }
    }
}
