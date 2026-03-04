package com.optimize.elykia.core.controller;

import com.lowagie.text.DocumentException;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.CompareSessionsRequestDto;
import com.optimize.elykia.core.dto.SessionComparisonDto;
import com.optimize.elykia.core.dto.SessionStatsDto;
import com.optimize.elykia.core.dto.TontineSessionDto;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.service.tontine.TontineExportService;
import com.optimize.elykia.core.service.tontine.TontineSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/tontines/sessions")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des sessions de tontine")
@CrossOrigin
public class TontineSessionController {

    private final TontineSessionService sessionService;
    private final TontineExportService exportService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_ADMIN')")
    @Operation(summary = "Lister toutes les sessions de tontine")
    public ResponseEntity<Response> getAllSessions() {
        List<TontineSessionDto> sessions = sessionService.getAllSessions();
        return new ResponseEntity<>(
            ResponseUtil.successResponse(sessions), 
            HttpStatus.OK
        );
    }

    @GetMapping("/{sessionId}")
    @PreAuthorize("hasAnyRole('ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_ADMIN')")
    @Operation(summary = "Obtenir les détails d'une session")
    public ResponseEntity<Response> getSessionById(@PathVariable Long sessionId) {
        TontineSessionDto session = sessionService.getSessionById(sessionId);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(session), 
            HttpStatus.OK
        );
    }

    @GetMapping("/{sessionId}/members")
    @PreAuthorize("hasAnyRole('ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_ADMIN')")
    @Operation(summary = "Obtenir les membres d'une session spécifique")
    public ResponseEntity<Response> getSessionMembers(
            @PathVariable Long sessionId,
            Pageable pageable) {
        Page<TontineMember> members = sessionService.getSessionMembers(sessionId, pageable);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(members), 
            HttpStatus.OK
        );
    }

    @GetMapping("/{sessionId}/stats")
    @PreAuthorize("hasAnyRole('ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_ADMIN')")
    @Operation(summary = "Obtenir les statistiques d'une session")
    public ResponseEntity<Response> getSessionStats(@PathVariable Long sessionId) {
        SessionStatsDto stats = sessionService.getSessionStats(sessionId);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(stats), 
            HttpStatus.OK
        );
    }

    @PostMapping("/compare")
    @PreAuthorize("hasAnyRole('ROLE_REPORT', 'ROLE_ADMIN')")
    @Operation(summary = "Comparer plusieurs sessions de tontine")
    public ResponseEntity<Response> compareSessions(
            @RequestBody @Valid CompareSessionsRequestDto request) {
        SessionComparisonDto comparison = sessionService.compareSessions(request.getYears());
        return new ResponseEntity<>(
            ResponseUtil.successResponse(comparison), 
            HttpStatus.OK
        );
    }

    @GetMapping("/{sessionId}/export/excel")
    @PreAuthorize("hasAnyRole('ROLE_REPORT', 'ROLE_ADMIN')")
    @Operation(summary = "Exporter une session en Excel")
    public ResponseEntity<InputStreamResource> exportSessionToExcel(@PathVariable Long sessionId) throws IOException {
        InputStream excelStream = exportService.exportSessionToExcel(sessionId);
        
        TontineSessionDto session = sessionService.getSessionById(sessionId);
        String filename = "tontine_session_" + session.getYear() + ".xlsx";
        
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
        headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        headers.add(HttpHeaders.PRAGMA, "no-cache");
        headers.add(HttpHeaders.EXPIRES, "0");
        
        return ResponseEntity.ok()
            .headers(headers)
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(new InputStreamResource(excelStream));
    }

    @GetMapping("/{sessionId}/export/pdf")
    @PreAuthorize("hasAnyRole('ROLE_REPORT', 'ROLE_ADMIN')")
    @Operation(summary = "Exporter une session en PDF")
    public ResponseEntity<InputStreamResource> exportSessionToPdf(@PathVariable Long sessionId) throws DocumentException {
        InputStream pdfStream = exportService.exportSessionToPdf(sessionId);
        
        TontineSessionDto session = sessionService.getSessionById(sessionId);
        String filename = "tontine_session_" + session.getYear() + ".pdf";
        
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
        headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        headers.add(HttpHeaders.PRAGMA, "no-cache");
        headers.add(HttpHeaders.EXPIRES, "0");
        
        return ResponseEntity.ok()
            .headers(headers)
            .contentType(MediaType.APPLICATION_PDF)
            .body(new InputStreamResource(pdfStream));
    }
}
