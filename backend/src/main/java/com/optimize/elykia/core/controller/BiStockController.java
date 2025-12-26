package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.bi.StockAlertDto;
import com.optimize.elykia.core.service.BiStockAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/bi/stock")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API BI - Analyse du Stock")
@CrossOrigin
public class BiStockController {

    private final BiStockAnalyticsService stockAnalyticsService;

    @GetMapping("/alerts")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Alertes de stock (ruptures et stock faible)")
    public ResponseEntity<Response> getStockAlerts() {
        List<StockAlertDto> alerts = stockAnalyticsService.getStockAlerts();
        return new ResponseEntity<>(ResponseUtil.successResponse(alerts), HttpStatus.OK);
    }

    @GetMapping("/out-of-stock")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Articles en rupture de stock")
    public ResponseEntity<Response> getOutOfStockItems() {
        List<StockAlertDto> items = stockAnalyticsService.getOutOfStockItems();
        return new ResponseEntity<>(ResponseUtil.successResponse(items), HttpStatus.OK);
    }

    @GetMapping("/low-stock")
    //@PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @Operation(summary = "Articles en stock faible")
    public ResponseEntity<Response> getLowStockItems() {
        List<StockAlertDto> items = stockAnalyticsService.getLowStockItems();
        return new ResponseEntity<>(ResponseUtil.successResponse(items), HttpStatus.OK);
    }
}
