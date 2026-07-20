package com.optimize.elykia.core.controller.inventory;

import com.lowagie.text.DocumentException;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ArticleStockTrajectoryDto;
import com.optimize.elykia.core.dto.InventoryDto;
import com.optimize.elykia.core.dto.InventoryItemDto;
import com.optimize.elykia.core.dto.InventorySummaryDto;
import com.optimize.elykia.core.dto.PhysicalQuantitySubmissionDto;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import com.optimize.elykia.core.service.store.ArticleStockTrajectoryService;
import com.optimize.elykia.core.service.store.InventoryService;
import com.optimize.elykia.core.service.report.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/inventories")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des inventaires")
@CrossOrigin
public class InventoryController {

    private final InventoryService inventoryService;
    private final ArticleStockTrajectoryService trajectoryService;
    private final PdfService pdfService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_CREATE_INVENTORY', 'ROLE_REPORT', 'ROLE_STOREKEEPER')")
    @Operation(summary = "Créer un nouvel inventaire")
    public ResponseEntity<Response> createInventory() {
        InventoryDto dto = inventoryService.toInventoryDto(inventoryService.createInventory());
        return new ResponseEntity<>(ResponseUtil.successResponse(dto), HttpStatus.CREATED);
    }

    @GetMapping("/current")
    @Operation(summary = "Obtenir l'inventaire en cours")
    public ResponseEntity<Response> getCurrentInventory() {
        return inventoryService.getCurrentInventory()
                .map(inventory -> new ResponseEntity<>(ResponseUtil.successResponse(inventoryService.toInventoryDto(inventory)), HttpStatus.OK))
                .orElse(new ResponseEntity<>(ResponseUtil.successResponse(null), HttpStatus.OK));
    }

    @GetMapping("/items/{itemId}/trajectory")
    @PreAuthorize("hasRole('ROLE_CONSULT_INVENTORY_HISTORY')")
    @Operation(summary = "Trajectoire stock depuis un item d'inventaire jusqu'à une date T")
    public ResponseEntity<Response> getItemTrajectory(
            @PathVariable Long itemId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        ArticleStockTrajectoryDto trajectory = trajectoryService.getTrajectoryFromInventoryItem(itemId, toDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(trajectory), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CONSULT_INVENTORY_HISTORY')")
    @Operation(summary = "Obtenir un inventaire par ID")
    public ResponseEntity<Response> getInventoryById(@PathVariable Long id) {
        InventoryDto dto = inventoryService.toInventoryDto(inventoryService.getInventoryById(id));
        return new ResponseEntity<>(ResponseUtil.successResponse(dto), HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize("hasRole('ROLE_CONSULT_INVENTORY_HISTORY')")
    @Operation(summary = "Lister les inventaires (résumé paginé avec filtres)")
    public ResponseEntity<Response> getAllInventories(
            @RequestParam(required = false) InventoryStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            Pageable pageable) {
        Page<InventorySummaryDto> page = inventoryService.getInventorySummaries(status, fromDate, toDate, pageable);
        return new ResponseEntity<>(ResponseUtil.successResponse(page), HttpStatus.OK);
    }

    @PostMapping("/{id}/submit-physical-quantities")
    @PreAuthorize("hasAnyRole('ROLE_CREATE_INVENTORY', 'ROLE_REPORT', 'ROLE_STOREKEEPER')")
    @Operation(summary = "Soumettre les quantités physiques")
    public ResponseEntity<Response> submitPhysicalQuantities(
            @PathVariable Long id,
            @RequestBody @Valid PhysicalQuantitySubmissionDto dto) {
        dto.setInventoryId(id);
        InventoryDto result = inventoryService.toInventoryDto(inventoryService.submitPhysicalQuantities(dto));
        return new ResponseEntity<>(ResponseUtil.successResponse(result), HttpStatus.OK);
    }

    @GetMapping("/{id}/items")
    @Operation(summary = "Obtenir les articles de l'inventaire")
    public ResponseEntity<Response> getInventoryItems(@PathVariable Long id) {
        List<InventoryItemDto> items = inventoryService.getInventoryItems(id);
        return new ResponseEntity<>(ResponseUtil.successResponse(items), HttpStatus.OK);
    }

    @GetMapping("/{id}/discrepancies")
    @PreAuthorize("hasAnyRole('ROLE_RECONCILE_INVENTORY', 'ROLE_REPORT')")
    @Operation(summary = "Obtenir les articles avec écarts")
    public ResponseEntity<Response> getDiscrepancies(@PathVariable Long id) {
        List<InventoryItemDto> items = inventoryService.getInventoryItemsWithDiscrepancies(id);
        return new ResponseEntity<>(ResponseUtil.successResponse(items), HttpStatus.OK);
    }

    @PostMapping("/{id}/finalize")
    @PreAuthorize("hasAnyRole('ROLE_FINALIZE_INVENTORY', 'ROLE_REPORT')")
    @Operation(summary = "Finaliser l'inventaire")
    public ResponseEntity<Response> finalizeInventory(@PathVariable Long id) {
        InventoryDto dto = inventoryService.toInventoryDto(inventoryService.finalizeInventory(id));
        return new ResponseEntity<>(ResponseUtil.successResponse(dto), HttpStatus.OK);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('ROLE_CREATE_INVENTORY', 'ROLE_REPORT', 'ROLE_STOREKEEPER')")
    @Operation(summary = "Télécharger le PDF de contrôle d'inventaire")
    public ResponseEntity<Resource> downloadInventoryPdf(@PathVariable Long id) {
        try {
            InputStream pdfStream = pdfService.generateInventoryControlPdf(id);
            InputStreamResource resource = new InputStreamResource(pdfStream);
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=fiche_controle_inventaire_" + id + ".pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (DocumentException e) {
            log.error("Erreur lors de la génération du PDF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

