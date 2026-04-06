package com.optimize.elykia.core.controller.report;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.enumaration.PeriodState;
import com.optimize.elykia.core.service.report.ReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "API de gestion des rapports")
@CrossOrigin
public class ReportController {
    private final ReportService reportService;

    @GetMapping(value = "by-collector")
    public ResponseEntity<Response> getReportsByCollector(@RequestParam(name = "period", defaultValue = "CETTE_SEMAINE") PeriodState period) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(reportService.getAccountancyReports(period)), HttpStatus.OK);
    }

    @GetMapping(value = "total-amount-by-period")
    public ResponseEntity<Response> getTotalAmountByPeriod(@RequestParam(name = "period", defaultValue = "CETTE_SEMAINE") PeriodState period) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(reportService.getTotalCollectedAmountByPeriod(period)), HttpStatus.OK);
    }

    @GetMapping(value = "accountancy-by-collector/{collector}")
    public ResponseEntity<Response> getAccountancyByCollector(@RequestParam(name = "period", defaultValue = "CETTE_SEMAINE") PeriodState period, @PathVariable String collector) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(reportService.getOperationsByCollectorAndPeriod(period, collector)), HttpStatus.OK);
    }


}
