package com.optimize.elykia.core.controller.sale;

import com.optimize.elykia.core.dto.SaleCancellationExecuteDto;
import com.optimize.elykia.core.dto.SaleCancellationFilterDto;
import com.optimize.elykia.core.dto.SaleCancellationPreviewDto;
import com.optimize.elykia.core.dto.SaleCancellationRunDto;
import com.optimize.elykia.core.service.sale.SaleCancellationService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/sales/cancellation")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Annulation de Ventes Commerciales")
@CrossOrigin
public class SaleCancellationController {

    private final SaleCancellationService cancellationService;

    private static final String ADMIN_ONLY = "hasRole('" + UserPermissionConstant.ADMIN + "')";
    private static final String CONSULT_ROLES = "hasAnyRole('"
            + UserPermissionConstant.ADMIN + "', '"
            + UserPermissionConstant.GESTIONNAIRE + "')";

    @PostMapping("/preview")
    @PreAuthorize(ADMIN_ONLY)
    @Operation(summary = "Simuler l'annulation des ventes (Dry-Run) sans modification")
    public ResponseEntity<SaleCancellationPreviewDto> previewCancellation(
            @Valid @RequestBody SaleCancellationFilterDto filter) {
        return ResponseEntity.ok(cancellationService.previewCancellation(filter));
    }

    @PostMapping("/execute")
    @PreAuthorize(ADMIN_ONLY)
    @Operation(summary = "Exécuter l'annulation des ventes éligibles avec archivage PDF")
    public ResponseEntity<SaleCancellationRunDto> executeCancellation(
            @Valid @RequestBody SaleCancellationExecuteDto executeDto) {
        return ResponseEntity.ok(cancellationService.executeCancellation(executeDto));
    }

    @GetMapping("/runs")
    @PreAuthorize(CONSULT_ROLES)
    @Operation(summary = "Consulter l'historique des opérations d'annulation")
    public ResponseEntity<Page<SaleCancellationRunDto>> getRuns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        return ResponseEntity.ok(cancellationService.getRuns(PageRequest.of(safePage, safeSize)));
    }

    @GetMapping("/runs/{id}")
    @PreAuthorize(CONSULT_ROLES)
    @Operation(summary = "Détails d'une opération d'annulation et liste des pièces d'audit")
    public ResponseEntity<SaleCancellationRunDto> getRunDetails(@PathVariable Long id) {
        return ResponseEntity.ok(cancellationService.getRunDetails(id));
    }

    @GetMapping("/files/{fileId}/download")
    @PreAuthorize(CONSULT_ROLES)
    @Operation(summary = "Télécharger un PDF d'audit ou le rapport global de synthèse")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long fileId) {
        var file = cancellationService.downloadFile(fileId);
        String safeName = file.fileName() == null ? "audit.pdf" : file.fileName().replaceAll("[^A-Za-z0-9._-]", "_");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeName + "\"")
                .body(file.content());
    }
}
