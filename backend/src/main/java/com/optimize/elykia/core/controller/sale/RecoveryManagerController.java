package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.sale.CloseCreditsRequestDto;
import com.optimize.elykia.core.dto.sale.FieldDayPlanRequestDto;
import com.optimize.elykia.core.dto.sale.RmClientContactUpdateDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.service.report.RecoveryManagerReportPdfService;
import com.optimize.elykia.core.service.sale.RecoveryFieldPlanService;
import com.optimize.elykia.core.service.sale.RecoveryManagerService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("api/v1/recovery-manager")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "API Chef de Recouvrement")
@CrossOrigin
public class RecoveryManagerController {

    private final RecoveryManagerService recoveryManagerService;
    private final RecoveryManagerReportPdfService reportPdfService;
    private final RecoveryFieldPlanService recoveryFieldPlanService;
    private final UserService userService;

    @PostMapping("/close-credits")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> closeCredits(@RequestBody @Valid CloseCreditsRequestDto dto) {
        String username = userService.getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryManagerService.closeCredits(dto, username)),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/operations")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Response> getOperations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername,
            @RequestParam(required = false) String commercialUsername,
            @PageableDefault(sort = "operationDate", direction = Sort.Direction.DESC) Pageable pageable) {
        String username = recoveryManagerUsername;
        if (username == null) {
            username = userService.getCurrentUser().getUsername();
        }
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryManagerService.getOperations(startDate, endDate, username, commercialUsername, pageable)),
                HttpStatus.OK
        );
    }

    @GetMapping("/report/summary")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Response> getReportSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername,
            @RequestParam(required = false) String commercialUsername) {
        String username = recoveryManagerUsername;
        if (username == null) {
            username = userService.getCurrentUser().getUsername();
        }
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryManagerService.getReportSummary(startDate, endDate, username, commercialUsername)),
                HttpStatus.OK
        );
    }

    @GetMapping("/report/pdf")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<byte[]> getReportPdf(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername,
            @RequestParam(required = false) String commercialUsername) {
        String username = recoveryManagerUsername;
        if (username == null) {
            username = userService.getCurrentUser().getUsername();
        }
        byte[] pdfBytes = reportPdfService.generatePdf(startDate, endDate, username, commercialUsername);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "rapport_recouvrement_terrain.pdf");
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    @GetMapping("/field-plans/collector-stats")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> getCollectorStats() {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryFieldPlanService.getCollectorStats()),
                HttpStatus.OK
        );
    }

    @PostMapping("/field-plans")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> createFieldPlan(@RequestBody @Valid FieldDayPlanRequestDto dto) {
        String username = userService.getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryFieldPlanService.createOrReplacePlan(dto, username)),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/field-plans/today")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> getTodayFieldPlan() {
        String username = userService.getCurrentUser().getUsername();
        return recoveryFieldPlanService.getTodayPlan(username)
                .map(plan -> new ResponseEntity<>(ResponseUtil.successResponse(plan), HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(ResponseUtil.successResponse(null), HttpStatus.OK));
    }

    @PatchMapping("/field-plans/{id}")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> updateFieldPlan(
            @PathVariable Long id,
            @RequestBody @Valid FieldDayPlanRequestDto dto) {
        String username = userService.getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryFieldPlanService.updatePlan(id, dto, username)),
                HttpStatus.OK
        );
    }

    @PostMapping("/field-plans/{id}/close")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> closeFieldPlan(@PathVariable Long id) {
        String username = userService.getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryFieldPlanService.closePlan(id, username)),
                HttpStatus.OK
        );
    }

    @GetMapping("/field-plans/{id}/offline-pack")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> getOfflinePack(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean includeTontine) {
        String username = userService.getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryFieldPlanService.buildOfflinePack(id, username, includeTontine)),
                HttpStatus.OK
        );
    }

    @PatchMapping("/clients/{id}/contact")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> updateClientContact(
            @PathVariable Long id,
            @RequestBody @Valid RmClientContactUpdateDto dto) {
        String username = userService.getCurrentUser().getUsername();
        return new ResponseEntity<>(
                ResponseUtil.successResponse(recoveryFieldPlanService.updateClientContact(id, dto, username)),
                HttpStatus.OK
        );
    }
}
