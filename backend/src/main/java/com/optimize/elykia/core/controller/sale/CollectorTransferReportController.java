package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.sale.CollectorTransferReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/credits/collector-transfers")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "API rapport transferts commerciaux")
@CrossOrigin
public class CollectorTransferReportController {

    private static final String ACCESS_ROLES =
            "hasAnyRole('RECOVERY_MANAGER', 'ADMIN') "
                    + "or authentication.principal.profil == 'GESTIONNAIRE' "
                    + "or authentication.principal.profil == 'SECRETARY'";

    private final CollectorTransferReportService collectorTransferReportService;

    @GetMapping("/summary")
    @PreAuthorize("(" + ACCESS_ROLES + ") and hasAuthority('ROLE_KPI_FINANCIER_TRANSFERT_VENTE')")
    public ResponseEntity<Response> getSummary(
            @RequestParam(required = false) String oldCollector,
            @RequestParam(required = false) String newCollector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        collectorTransferReportService.getSummary(oldCollector, newCollector, fromDate, toDate)),
                HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize(ACCESS_ROLES)
    public ResponseEntity<Response> getDetails(
            @RequestParam(required = false) String oldCollector,
            @RequestParam(required = false) String newCollector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        collectorTransferReportService.getDetails(oldCollector, newCollector, fromDate, toDate)),
                HttpStatus.OK);
    }
}
