package com.optimize.elykia.inventory.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.inventory.application.*;
import com.optimize.elykia.inventory.domain.*;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.web.dto.LotLifecycleTraceDto;
import com.optimize.elykia.inventory.web.dto.SupplierRestockOrderDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * API REST v2 pour la gestion du stock magasin multi-agences :
 * - Positions magasin par agence ({@code onHandQuantity}, {@code reservedQuantity}, {@code availableQuantity}, {@code shortageQuantity})
 * - Réservations actives et en attente ({@code BACKORDERED} / {@code PARTIALLY_RESERVED})
 * - Grand livre magasin unifié ({@link WarehouseStockLedgerEntry})
 * - Traçabilité de bout en bout des lots ({@link LotLifecycleTraceDto})
 * - Bon de Commande Fournisseur JSON & PDF Navy Elykia ({@link SupplierRestockOrderService})
 * - Transferts de stock inter-agences ({@link WarehouseStockTransferService})
 */
@RestController
@RequestMapping("/api/v2/warehouse-stocks")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Stock Magasin Multi-Agences (v2)")
@CrossOrigin
public class WarehouseStockController {

    private final WarehouseStockService warehouseStockService;
    private final WarehouseStockTransferService transferService;
    private final WarehouseLotTraceabilityService traceabilityService;
    private final SupplierRestockOrderService supplierRestockOrderService;
    private final ArticlesRepository articlesRepository;

    public record WarehousePositionRowDto(
            Long id,
            Long agencyId,
            Long articleId,
            String articleCode,
            String articleName,
            int onHandQuantity,
            int reservedQuantity,
            int availableQuantity,
            int shortageQuantity,
            Double purchasePrice,
            Double sellingPrice,
            Double creditSalePrice) {
    }

    @GetMapping("/positions")
    @Operation(summary = "Positions du stock magasin par agence (En stock, Réservé, Disponible, Manquant)")
    public ResponseEntity<Response> getPositions(@RequestParam(required = false) Long agencyId) {
        Long effectiveAgencyId = warehouseStockService.resolveAgencyId(agencyId);
        Map<Long, Integer> shortages = warehouseStockService.getShortagesByArticle(effectiveAgencyId);
        List<WarehousePositionRowDto> rows = articlesRepository.findAll().stream()
                .map(article -> {
                    WarehouseStockPosition pos = warehouseStockService.getOrBuildPositionView(effectiveAgencyId, article);
                    return new WarehousePositionRowDto(
                            pos.getId(),
                            effectiveAgencyId,
                            article.getId(),
                            article.getCode(),
                            (article.getCommercialName() + " " + article.getName()).trim(),
                            pos.getOnHandQuantity() != null ? pos.getOnHandQuantity() : 0,
                            pos.getReservedQuantity() != null ? pos.getReservedQuantity() : 0,
                            pos.availableQuantity(),
                            shortages.getOrDefault(article.getId(), 0),
                            article.getPurchasePrice(),
                            article.getSellingPrice(),
                            article.getCreditSalePrice());
                })
                .toList();
        return ResponseEntity.ok(ResponseUtil.successResponse(rows));
    }

    @GetMapping("/reservations")
    @Operation(summary = "Réservations magasin ouvertes (ACTIVE, PARTIALLY_RESERVED, BACKORDERED)")
    public ResponseEntity<Response> getReservations(@RequestParam(required = false) Long agencyId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                warehouseStockService.getOpenReservationsByAgency(agencyId)));
    }

    @GetMapping("/ledger")
    @Operation(summary = "Grand livre unifié des mouvements du stock magasin")
    public ResponseEntity<Response> getLedger(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) Long articleId,
            @RequestParam(required = false) String movementType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        Page<WarehouseStockLedgerEntry> page = warehouseStockService.searchLedger(
                agencyId, articleId, movementType, startDate, endDate, pageable);
        return ResponseEntity.ok(ResponseUtil.successResponse(page));
    }

    @GetMapping("/lots/trace")
    @Operation(summary = "Liste de traçabilité et liquidation des lots magasin")
    public ResponseEntity<Response> listLotTraces(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) Long articleId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                traceabilityService.listLotTraces(agencyId, articleId)));
    }

    @GetMapping("/lots/{lotId}/trace")
    @Operation(summary = "Traçabilité complète d'un lot magasin (Réception -> Commerciaux -> Ventes Clients)")
    public ResponseEntity<Response> getLotTrace(@PathVariable Long lotId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                traceabilityService.getLotTrace(lotId)));
    }

    @GetMapping("/restock-order")
    @Operation(summary = "Bon de Commande Fournisseur (JSON) basé sur les demandes commerciales unifiées non couvertes")
    public ResponseEntity<Response> getSupplierRestockOrder(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false, defaultValue = "ALL") String activityType) {
        SupplierRestockOrderDto dto = supplierRestockOrderService.computeRestockOrder(agencyId, activityType);
        return ResponseEntity.ok(ResponseUtil.successResponse(dto));
    }

    @GetMapping(value = "/restock-order/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Export PDF Navy Elykia du Bon de Commande Fournisseur")
    public ResponseEntity<byte[]> exportSupplierRestockOrderPdf(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false, defaultValue = "ALL") String activityType) {
        byte[] pdf = supplierRestockOrderService.generateRestockOrderPdf(agencyId, activityType);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=bon-commande-fournisseur.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/transfers")
    @Operation(summary = "Recherche des transferts de stock inter-agences")
    public ResponseEntity<Response> searchTransfers(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) WarehouseTransferStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                transferService.search(agencyId, status, pageable)));
    }

    @GetMapping("/transfers/{id}")
    @Operation(summary = "Détail d'un transfert de stock inter-agences")
    public ResponseEntity<Response> getTransferById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(transferService.getById(id)));
    }

    @PostMapping("/transfers")
    @Operation(summary = "Créer un transfert inter-agences (Chef Magasinier)")
    public ResponseEntity<Response> createTransfer(
            @RequestBody WarehouseStockTransferService.CreateTransferRequest request) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(transferService.createTransfer(request)),
                HttpStatus.CREATED);
    }

    @PostMapping("/transfers/{id}/validate")
    @Operation(summary = "Valider un transfert inter-agences et réserver le stock source")
    public ResponseEntity<Response> validateTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(transferService.validateTransfer(id)));
    }

    @PostMapping("/transfers/{id}/ship")
    @Operation(summary = "Expédier un transfert inter-agences (sortie FIFO magasin source)")
    public ResponseEntity<Response> shipTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(transferService.shipTransfer(id)));
    }

    @PostMapping("/transfers/{id}/receive")
    @Operation(summary = "Réceptionner un transfert inter-agences (entrée FIFO magasin cible avec parent_lot_id)")
    public ResponseEntity<Response> receiveTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(transferService.receiveTransfer(id)));
    }

    @PostMapping("/transfers/{id}/cancel")
    @Operation(summary = "Annuler un transfert inter-agences non expédié")
    public ResponseEntity<Response> cancelTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(transferService.cancelTransfer(id)));
    }
}
