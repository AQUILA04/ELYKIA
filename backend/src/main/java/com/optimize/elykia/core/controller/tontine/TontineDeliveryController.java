package com.optimize.elykia.core.controller.tontine;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.BulkCountResult;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.ValidateTontineDeliveriesDto;
import com.optimize.elykia.core.dto.UpdateDeliveryItemsDto;
import com.optimize.elykia.core.dto.ElasticSearchWrapper;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOutcome;
import com.optimize.elykia.core.service.tontine.TontineDeliveryService;
import com.optimize.elykia.core.service.tontine.TontineDeliveryWebService;
import com.optimize.elykia.core.service.tontine.TontineOrderReceiptPdfService;
import com.optimize.elykia.core.service.tontine.TontinePlannedDeliveriesPdfService;
import com.optimize.elykia.core.service.tontine.conflict.TontineDeliveryConflictService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/tontines/deliveries")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des livraisons de tontine")
@CrossOrigin
public class TontineDeliveryController {

    private final TontineDeliveryService deliveryService;
    private final TontineDeliveryWebService deliveryWebService;
    private final TontineOrderReceiptPdfService orderReceiptPdfService;
    private final TontinePlannedDeliveriesPdfService plannedDeliveriesPdfService;
    private final TontineDeliveryConflictService conflictService;

    @PostMapping
    //@PreAuthorize("hasAnyRole('ROLE_EDIT_TONTINE', 'ROLE_ADMIN', 'ROLE_GESTIONNAIRE')")
    @Operation(summary = "Créer une commande de livraison tontine (statut PENDING / VALIDATED selon le profil)")
    public ResponseEntity<Response> createDelivery(@RequestBody @Valid CreateDeliveryDto dto) {
        TontineDeliveryDto delivery = deliveryService.createDelivery(dto);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(delivery, "Commande de livraison créée avec succès"),
            HttpStatus.CREATED
        );
    }

    @PostMapping("/distribute")
    //@PreAuthorize("hasAnyRole('ROLE_EDIT_TONTINE', 'ROLE_ADMIN', 'ROLE_GESTIONNAIRE')")
    @Operation(summary = "Livraison directe tontine (création + validation + remise immédiate)")
    public ResponseEntity<Response> distributeDelivery(@RequestBody @Valid CreateDeliveryDto dto) {
        TontineDeliveryDto delivery = deliveryService.distributeTontineDelivery(dto);
        return new ResponseEntity<>(
                ResponseUtil.successResponse(delivery, "Livraison directe créée avec succès"),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/member/{tontineMemberId}")
    //@PreAuthorize("hasAnyRole('ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_ADMIN')")
    @Operation(summary = "Consulter la livraison d'un membre")
    public ResponseEntity<Response> getDeliveryByMemberId(@PathVariable Long tontineMemberId) {
        TontineDeliveryDto delivery = deliveryService.getDeliveryByMemberId(tontineMemberId);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(delivery), 
            HttpStatus.OK
        );
    }

    @GetMapping("/pending-count")
    @Operation(summary = "Compter les livraisons en attente du filtre courant")
    public ResponseEntity<Response> countPending(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) String search) {
        long count = deliveryWebService.countPending(startOf(dateFrom), endOf(dateTo), commercial, search);
        return new ResponseEntity<>(ResponseUtil.successResponse(new BulkCountResult((int) count)), HttpStatus.OK);
    }

    @PostMapping("/validate-selection")
    @Operation(summary = "Valider les livraisons en attente sélectionnées")
    public ResponseEntity<Response> validateSelection(@RequestBody @Valid ValidateTontineDeliveriesDto dto) {
        int validated = deliveryService.validateSelected(dto.getDeliveryIds());
        return new ResponseEntity<>(
                ResponseUtil.successResponse(new BulkCountResult(validated), "Livraisons validées"),
                HttpStatus.OK);
    }

    @PostMapping("/validate-pending")
    @Operation(summary = "Valider toutes les livraisons en attente du filtre courant")
    public ResponseEntity<Response> validatePending(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) String search) {
        List<Long> ids = deliveryWebService.findPending(startOf(dateFrom), endOf(dateTo), commercial, search)
                .stream()
                .map(delivery -> delivery.getId())
                .toList();
        int validated = ids.isEmpty() ? 0 : deliveryService.validateStillPending(ids);
        return new ResponseEntity<>(
                ResponseUtil.successResponse(new BulkCountResult(validated), "Livraisons validées"),
                HttpStatus.OK);
    }

    @PatchMapping("/{deliveryId}/validate")
    //@PreAuthorize("hasAnyRole('ROLE_GESTIONNAIRE', 'ROLE_ADMIN')")
    @Operation(summary = "Valider une livraison en attente")
    public ResponseEntity<Response> validateDelivery(@PathVariable Long deliveryId) {
        TontineDeliveryDto delivery = deliveryService.validateDelivery(deliveryId);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(delivery, "Livraison validée avec succès"),
            HttpStatus.OK
        );
    }

    @GetMapping("/validated")
    //@PreAuthorize("hasAnyRole('ROLE_MAGASINIER', 'ROLE_ADMIN')")
    @Operation(summary = "Lister les livraisons validées, prêtes à être servies")
    public ResponseEntity<Response> getValidatedDeliveries(Pageable pageable) {
        Page<TontineDeliveryDto> deliveries = deliveryService.getValidatedDeliveries(pageable);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(deliveries),
            HttpStatus.OK
        );
    }

    @PutMapping("/{deliveryId}/items")
    @Operation(summary = "Modifier les articles d'une commande pas encore livrée")
    public ResponseEntity<Response> replaceItems(
            @PathVariable Long deliveryId,
            @RequestBody @Valid UpdateDeliveryItemsDto dto) {
        TontineDeliveryDto delivery = deliveryService.replaceItems(deliveryId, dto.getItems());
        return new ResponseEntity<>(
                ResponseUtil.successResponse(delivery, "Commande mise à jour"),
                HttpStatus.OK);
    }

    @PatchMapping("/{deliveryId}/deliver")
    //@PreAuthorize("hasAnyRole('ROLE_MAGASINIER', 'ROLE_ADMIN')")
    @Operation(summary = "Marquer une livraison comme servie (livrée)")
    public ResponseEntity<Response> deliverDelivery(@PathVariable Long deliveryId) {
        TontineDeliveryDto delivery = deliveryService.deliverDelivery(deliveryId);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(delivery, "Livraison marquée comme servie"),
            HttpStatus.OK
        );
    }

    @GetMapping("/verify")
    @Operation(summary = "Vérifier qu'un reçu de commande tontine provient d'Elykia")
    public ResponseEntity<Response> verifyReceipt(@RequestParam String code) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(orderReceiptPdfService.verify(code)),
                HttpStatus.OK);
    }

    @GetMapping("/planned/pdf")
    @Operation(summary = "PDF des membres à livrer à une date prévue (commandes non encore remises)")
    public ResponseEntity<byte[]> downloadPlannedDeliveries(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String commercial) {
        byte[] pdf = plannedDeliveriesPdfService.generate(date, commercial);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=membres-a-livrer-" + date + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/{id}/receipt")
    @Operation(summary = "Télécharger le reçu PDF d'une commande tontine")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable Long id) {
        byte[] pdf = orderReceiptPdfService.generate(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=recu-commande-tontine-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/list")
    @Operation(summary = "Lister les livraisons avec filtres commercial, période et recherche")
    public ResponseEntity<Response> getDeliveries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        LocalDateTime startDateTime = dateFrom != null ? dateFrom.atStartOfDay() : null;
        LocalDateTime endDateTime = dateTo != null ? dateTo.atTime(LocalTime.MAX) : null;

        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        deliveryWebService.getDeliveriesForWeb(startDateTime, endDateTime, commercial, search, pageable)),
                HttpStatus.OK);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_TONTINE_LIVRAISON + "')")
    @Operation(summary = "KPI des livraisons filtrées par commercial, période et recherche")
    public ResponseEntity<Response> getDeliveryKpiSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) String search) {
        LocalDateTime startDateTime = dateFrom != null ? dateFrom.atStartOfDay() : null;
        LocalDateTime endDateTime = dateTo != null ? dateTo.atTime(LocalTime.MAX) : null;

        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        deliveryWebService.getKpiSummary(startDateTime, endDateTime, commercial, search)),
                HttpStatus.OK);
    }

    @PostMapping("/elasticsearch")
    @Operation(summary = "Recherche élastique sur les livraisons et les informations client associées")
    public ResponseEntity<Response> elasticSearch(
            @RequestBody ElasticSearchWrapper wrapper,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String commercial,
            Pageable pageable) {
        LocalDateTime startDateTime = dateFrom != null ? dateFrom.atStartOfDay() : null;
        LocalDateTime endDateTime = dateTo != null ? dateTo.atTime(LocalTime.MAX) : null;

        return new ResponseEntity<>(
                ResponseUtil.successResponse(deliveryWebService.elasticsearch(
                        wrapper.getKeyword(), startDateTime, endDateTime, commercial, pageable)),
                HttpStatus.OK);
    }

    @GetMapping("/conflicts")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.ADMIN + "', '" + UserPermissionConstant.DEL_TONTINE + "')")
    @Operation(summary = "Journal des doublons : secondes commandes ou livraisons saisies pour un même membre (fusionnées ou refusées)")
    public ResponseEntity<Response> getConflicts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String commercial,
            @RequestParam(required = false) TontineDeliveryConflictOutcome outcome,
            Pageable pageable) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(conflictService.search(dateFrom, dateTo, commercial, outcome, pageable)),
                HttpStatus.OK);
    }

    private LocalDateTime startOf(LocalDate date) {
        return date != null ? date.atStartOfDay() : null;
    }

    private LocalDateTime endOf(LocalDate date) {
        return date != null ? date.atTime(LocalTime.MAX) : null;
    }
}
