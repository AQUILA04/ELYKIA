package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.bi.CollectionTrendDto;
import com.optimize.elykia.core.dto.bi.OverdueAnalysisDto;
import com.optimize.elykia.core.service.bi.BiCollectionAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/bi/collections")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API BI - Analyse des Recouvrements")
@CrossOrigin
public class BiCollectionController {

    private final BiCollectionAnalyticsService collectionAnalyticsService;

    @GetMapping("/trends")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Tendances des encaissements par jour")
    public ResponseEntity<Response> getCollectionTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();
        
        List<CollectionTrendDto> trends = collectionAnalyticsService.getCollectionTrends(startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(trends), HttpStatus.OK);
    }

    @GetMapping("/overdue-analysis")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Analyse des retards par tranche")
    public ResponseEntity<Response> getOverdueAnalysis() {
        List<OverdueAnalysisDto> analysis = collectionAnalyticsService.getOverdueAnalysis();
        return new ResponseEntity<>(ResponseUtil.successResponse(analysis), HttpStatus.OK);
    }
}
