package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.service.BiSalesAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/bi/sales")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API BI - Analyse des Ventes")
@CrossOrigin
public class BiSalesController {

    private final BiSalesAnalyticsService salesAnalyticsService;

    @GetMapping("/trends")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Tendances des ventes par jour")
    public ResponseEntity<Response> getSalesTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();
        
        List<SalesTrendDto> trends = salesAnalyticsService.getSalesTrends(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(trends), HttpStatus.OK);
    }

    @GetMapping("/by-commercial")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Performance des commerciaux")
    public ResponseEntity<Response> getCommercialRanking(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        List<CommercialPerformanceDto> ranking = salesAnalyticsService.getCommercialRanking(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(ranking), HttpStatus.OK);
    }

    @GetMapping("/by-article")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Performance des articles")
    public ResponseEntity<Response> getArticlePerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        
        List<ArticlePerformanceDto> performance = salesAnalyticsService.getArticlePerformance(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(performance), HttpStatus.OK);
    }
}
