package com.optimize.elykia.commercialstock.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.commercialstock.api.CommercialStockRequestFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockRequestStatus;
import com.optimize.elykia.commercialstock.api.CommercialStockReturnStatus;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * API REST v2 pour les Demandes de Sortie Commerciales Unifiées ({@code CommercialStockRequest})
 * et les Retours de Stock Commerciaux Unifiés ({@code CommercialStockReturn}) couvrant {@code CREDIT} et {@code TONTINE}.
 */
@RestController
@RequestMapping("/api/v2/commercial-stock-requests")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Demandes & Retours de Stock Commercial Unifiés (v2)")
@CrossOrigin
public class CommercialStockRequestController {

    private final CommercialStockRequestFacade facade;

    @GetMapping
    @Operation(summary = "Rechercher les demandes de sortie commerciales unifiées (CREDIT & TONTINE)")
    public ResponseEntity<Response> searchRequests(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) String commercialUsername,
            @RequestParam(required = false) StockActivityType activityType,
            @RequestParam(required = false) CommercialStockRequestStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                facade.searchRequests(agencyId, commercialUsername, activityType, status, startDate, endDate, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une demande de sortie commerciale unifiée")
    public ResponseEntity<Response> getRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.getRequestById(id)));
    }

    @PostMapping
    @Operation(summary = "Créer une demande de sortie commerciale unifiée (CREDIT ou TONTINE)")
    public ResponseEntity<Response> createRequest(
            @RequestBody CommercialStockRequestFacade.CreateRequestCommand command) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(facade.createRequest(command)),
                HttpStatus.CREATED);
    }

    @PostMapping("/{id}/validate")
    @Operation(summary = "Valider une demande commerciale unifiée et réserver le stock magasin (Option A)")
    public ResponseEntity<Response> validateRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.validateRequest(id)));
    }

    @PostMapping("/{id}/deliver")
    @Operation(summary = "Livrer une demande commerciale unifiée (avec gestion de livraison partielle Scénario B)")
    public ResponseEntity<Response> deliverRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.deliverRequest(id)));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Annuler une demande commerciale unifiée et libérer sa réservation")
    public ResponseEntity<Response> cancelRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.cancelRequest(id)));
    }

    @PostMapping("/{id}/refuse")
    @Operation(summary = "Refuser une demande commerciale unifiée")
    public ResponseEntity<Response> refuseRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.refuseRequest(id)));
    }

    @GetMapping("/returns")
    @Operation(summary = "Rechercher les retours de stock commerciaux unifiés (CREDIT & TONTINE)")
    public ResponseEntity<Response> searchReturns(
            @RequestParam(required = false) Long agencyId,
            @RequestParam(required = false) String commercialUsername,
            @RequestParam(required = false) StockActivityType activityType,
            @RequestParam(required = false) CommercialStockReturnStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                facade.searchReturns(agencyId, commercialUsername, activityType, status, startDate, endDate, pageable)));
    }

    @GetMapping("/returns/{id}")
    @Operation(summary = "Détail d'un retour de stock commercial unifié")
    public ResponseEntity<Response> getReturnById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.getReturnById(id)));
    }

    @PostMapping("/returns")
    @Operation(summary = "Créer un retour de stock commercial unifié")
    public ResponseEntity<Response> createReturn(
            @RequestBody CommercialStockRequestFacade.CreateReturnCommand command) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(facade.createReturn(command)),
                HttpStatus.CREATED);
    }

    @PostMapping("/returns/{id}/validate")
    @Operation(summary = "Valider un retour de stock commercial unifié et réintégrer au magasin")
    public ResponseEntity<Response> validateReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.validateReturn(id)));
    }

    @PostMapping("/returns/{id}/cancel")
    @Operation(summary = "Annuler un retour de stock commercial unifié")
    public ResponseEntity<Response> cancelReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.cancelReturn(id)));
    }

    @PostMapping("/returns/{id}/refuse")
    @Operation(summary = "Refuser un retour de stock commercial unifié")
    public ResponseEntity<Response> refuseReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(facade.refuseReturn(id)));
    }
}
