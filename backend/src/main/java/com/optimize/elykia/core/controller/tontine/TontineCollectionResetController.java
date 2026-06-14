package com.optimize.elykia.core.controller.tontine;

import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.service.tontine.TontineCollectionResetFacadeService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/tontine/collections/reset")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Réinitialisation des collectes tontine")
@CrossOrigin
public class TontineCollectionResetController {

    private final TontineCollectionResetFacadeService facadeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.RESET_TONTINE_COLLECTIONS + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Arborescence des archives PDF de collectes tontine")
    public ResponseEntity<List<Map<String, Object>>> getArchiveTree() {
        return ResponseEntity.ok(facadeService.getArchiveTree());
    }

    @GetMapping("/{fileId}/download")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.RESET_TONTINE_COLLECTIONS + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Télécharger un PDF d'archive de collectes")
    public ResponseEntity<byte[]> download(@PathVariable Long fileId) {
        var file = facadeService.getFileForDownload(fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.fileName() + "\"")
                .body(file.content());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.RESET_TONTINE_COLLECTIONS + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Archiver les collectes en PDF puis réinitialiser à zéro")
    public ResponseEntity<TontineCollectionResetRunDto> triggerReset() {
        return ResponseEntity.ok(facadeService.triggerReset());
    }

    @PostMapping("/export")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.RESET_TONTINE_COLLECTIONS + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Archiver les collectes en PDF sans réinitialiser")
    public ResponseEntity<TontineCollectionResetRunDto> triggerExportOnly() {
        return ResponseEntity.ok(facadeService.triggerExportOnly());
    }

    @GetMapping("/runs")
    @PreAuthorize("hasAnyRole('" + UserPermissionConstant.RESET_TONTINE_COLLECTIONS + "', '" + UserPermissionConstant.ADMIN + "')")
    @Operation(summary = "Historique des opérations de réinitialisation")
    public ResponseEntity<Page<TontineCollectionResetRunDto>> getRuns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(facadeService.getRuns(page, size));
    }
}
