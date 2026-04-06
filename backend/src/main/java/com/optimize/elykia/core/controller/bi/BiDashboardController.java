package com.optimize.elykia.core.controller.bi;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.service.bi.BiDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/bi/dashboard")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API BI Dashboard - Vue d'ensemble des performances")
@CrossOrigin
public class BiDashboardController {

    private final BiDashboardService biDashboardService;

    @GetMapping("/overview")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Vue d'ensemble du dashboard BI")
    public ResponseEntity<Response> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        DashboardOverviewDto overview = biDashboardService.getOverview(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(overview), HttpStatus.OK);
    }

    @GetMapping("/sales/metrics")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Métriques de ventes détaillées")
    public ResponseEntity<Response> getSalesMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        SalesMetricsDto metrics = biDashboardService.getSalesMetrics(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(metrics), HttpStatus.OK);
    }

    @GetMapping("/collections/metrics")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Métriques de recouvrement")
    public ResponseEntity<Response> getCollectionMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        CollectionMetricsDto metrics = biDashboardService.getCollectionMetrics(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(metrics), HttpStatus.OK);
    }

    @GetMapping("/stock/metrics")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Métriques de stock")
    public ResponseEntity<Response> getStockMetrics() {
        StockMetricsDto metrics = biDashboardService.getStockMetrics();
        return new ResponseEntity<>(ResponseUtil.successResponse(metrics), HttpStatus.OK);
    }

    @GetMapping("/portfolio/metrics")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Métriques du portefeuille")
    public ResponseEntity<Response> getPortfolioMetrics() {
        PortfolioMetricsDto metrics = biDashboardService.getPortfolioMetrics();
        return new ResponseEntity<>(ResponseUtil.successResponse(metrics), HttpStatus.OK);
    }
}
