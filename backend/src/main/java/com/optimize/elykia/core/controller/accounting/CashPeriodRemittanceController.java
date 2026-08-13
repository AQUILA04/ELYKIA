package com.optimize.elykia.core.controller.accounting;

import com.optimize.elykia.core.dto.report.CashPeriodRemittanceDto;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceRequest;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceSummaryDto;
import com.optimize.elykia.core.service.accounting.CashPeriodRemittanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("api/cash-period-remittances")
@RequiredArgsConstructor
public class CashPeriodRemittanceController {

    private final CashPeriodRemittanceService remittanceService;

    @GetMapping("/summary")
    public ResponseEntity<CashPeriodRemittanceSummaryDto> getSummary(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(remittanceService.getSummary(year, month));
    }

    @PostMapping("/submit")
    public ResponseEntity<CashPeriodRemittanceDto> submit(@RequestBody CashPeriodRemittanceRequest request) {
        return ResponseEntity.ok(remittanceService.submitBySecretary(
                request.getYear(), request.getMonth(),
                request.getExpenseIds() != null ? request.getExpenseIds() : Collections.emptyList()));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<CashPeriodRemittanceDto> acknowledge(
            @PathVariable Long id,
            @RequestBody(required = false) CashPeriodRemittanceRequest request) {
        return ResponseEntity.ok(remittanceService.acknowledgeByManager(
                id, request != null ? request.getExpenseIds() : null));
    }

    @PostMapping("/initiate")
    public ResponseEntity<CashPeriodRemittanceDto> initiate(@RequestBody CashPeriodRemittanceRequest request) {
        return ResponseEntity.ok(remittanceService.initiateByManager(
                request.getYear(), request.getMonth(),
                request.getExpenseIds() != null ? request.getExpenseIds() : Collections.emptyList()));
    }

    @GetMapping
    public ResponseEntity<Page<CashPeriodRemittanceDto>> list(
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(remittanceService.list(pageable));
    }
}
