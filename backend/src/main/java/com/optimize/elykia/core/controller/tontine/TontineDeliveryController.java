package com.optimize.elykia.core.controller.tontine;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.ElasticSearchWrapper;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.service.tontine.TontineDeliveryService;
import com.optimize.elykia.core.service.tontine.TontineDeliveryWebService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/tontines/deliveries")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des livraisons de tontine")
@CrossOrigin
public class TontineDeliveryController {

    private final TontineDeliveryService deliveryService;
    private final TontineDeliveryWebService deliveryWebService;

    @PostMapping
    //@PreAuthorize("hasAnyRole('ROLE_EDIT_TONTINE', 'ROLE_ADMIN', 'ROLE_GESTIONNAIRE')")
    @Operation(summary = "Créer une livraison de fin d'année pour un membre")
    public ResponseEntity<Response> createDelivery(@RequestBody @Valid CreateDeliveryDto dto) {
        TontineDeliveryDto delivery = deliveryService.createDelivery(dto);
        return new ResponseEntity<>(
            ResponseUtil.successResponse(delivery, "Livraison créée avec succès"), 
            HttpStatus.CREATED
        );
    }

    @PostMapping("/distribute")
    //@PreAuthorize("hasAnyRole('ROLE_EDIT_TONTINE', 'ROLE_ADMIN', 'ROLE_GESTIONNAIRE')")
    @Operation(summary = "Créer une livraison de fin d'année pour un membre")
    public ResponseEntity<Response> distributeDelivery(@RequestBody @Valid CreateDeliveryDto dto) {
        TontineDeliveryDto delivery = deliveryService.distributeTontineDelivery(dto);
        return new ResponseEntity<>(
                ResponseUtil.successResponse(delivery, "Livraison créée avec succès"),
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
}
