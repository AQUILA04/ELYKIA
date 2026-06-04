package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.sale.CloseCreditsRequestDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.service.report.RecoveryManagerReportPdfService;
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
}
