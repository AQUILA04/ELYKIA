package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.service.tontine.TontineDeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/tontines/deliveries")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des livraisons de tontine")
@CrossOrigin
public class TontineDeliveryController {

    private final TontineDeliveryService deliveryService;

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
}
