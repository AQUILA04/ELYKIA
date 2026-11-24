package com.optimize.elykia.finance.web;

import com.optimize.elykia.finance.application.CashSalesRegisterService;
import com.optimize.elykia.finance.domain.CashSalesRegisterSession;
import com.optimize.elykia.finance.web.dto.CashSalesRegisterSummaryDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** API de la caisse dédiée « Ventes comptant » et de son rapport journalier / par période. */
@RestController
@RequestMapping("/api/v1/cash-sales-register")
@CrossOrigin
public class CashSalesRegisterController {

    private final CashSalesRegisterService service;

    public CashSalesRegisterController(CashSalesRegisterService service) {
        this.service = service;
    }

    @GetMapping("/current")
    public ResponseEntity<CashSalesRegisterSession> current() {
        return service.getCurrentOpenSession().map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/open")
    public ResponseEntity<CashSalesRegisterSession> open(@RequestBody(required = false) OpenRequest request) {
        double openingFloat = request != null && request.openingFloat() != null ? request.openingFloat() : 0.0;
        return ResponseEntity.ok(service.openSession(openingFloat));
    }

    @PostMapping("/close")
    public ResponseEntity<CashSalesRegisterSession> close(@RequestBody(required = false) CloseRequest request) {
        Long sessionId = request != null ? request.sessionId() : null;
        Double counted = request != null ? request.countedClosing() : null;
        String notes = request != null ? request.closingNotes() : null;
        return ResponseEntity.ok(service.closeSession(sessionId, counted, notes));
    }

    @GetMapping("/report")
    public ResponseEntity<CashSalesRegisterSummaryDto> report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(service.getReport(startDate, endDate));
    }

    public record OpenRequest(Double openingFloat) {
    }

    public record CloseRequest(Long sessionId, Double countedClosing, String closingNotes) {
    }
}
