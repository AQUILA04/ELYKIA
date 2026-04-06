package com.optimize.elykia.core.controller.inventory;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.InventoryItemDto;
import com.optimize.elykia.core.dto.ReconciliationDto;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.inventory.InventoryReconciliation;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.service.store.InventoryReconciliationService;
import com.optimize.elykia.core.service.store.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/inventory-reconciliation")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de réconciliation d'inventaire")
@CrossOrigin
public class InventoryReconciliationController {

    private final InventoryReconciliationService reconciliationService;
    private final InventoryService inventoryService;

    @PostMapping("/reconcile")
    @PreAuthorize("hasAnyRole('ROLE_RECONCILE_INVENTORY', 'ROLE_REPORT')")
    @Operation(summary = "Réconcilier un écart")
    public ResponseEntity<Response> reconcile(@RequestBody @Valid ReconciliationDto dto) {
        InventoryItem item;
        
        // Déterminer le type de réconciliation basé sur l'action
        com.optimize.elykia.core.enumaration.ReconciliationAction action = dto.getAction();
        
        if (action == com.optimize.elykia.core.enumaration.ReconciliationAction.MARK_AS_SURPLUS) {
            item = reconciliationService.reconcileSurplus(dto);
        } else {
            // Pour ADJUST_TO_PHYSICAL, MARK_AS_DEBT, CANCEL_DEBT, on utilise reconcileDebt
            item = reconciliationService.reconcileDebt(dto);
        }
        
        // Convertir l'item en DTO en utilisant le mapper du service
        InventoryItemDto itemDto = inventoryService.getInventoryItems(item.getInventory().getId()).stream()
                .filter(i -> i.getId().equals(item.getId()))
                .findFirst()
                .orElseThrow(() -> new com.optimize.common.entities.exception.ResourceNotFoundException("Article d'inventaire non trouvé"));
        return new ResponseEntity<>(ResponseUtil.successResponse(itemDto), HttpStatus.OK);
    }

    @GetMapping("/history/{inventoryItemId}")
    @PreAuthorize("hasAnyRole('ROLE_RECONCILE_INVENTORY', 'ROLE_REPORT')")
    @Operation(summary = "Obtenir l'historique de réconciliation")
    public ResponseEntity<Response> getReconciliationHistory(@PathVariable Long inventoryItemId) {
        List<InventoryReconciliation> history = reconciliationService.getReconciliationHistory(inventoryItemId);
        return new ResponseEntity<>(ResponseUtil.successResponse(history), HttpStatus.OK);
    }

    @GetMapping("/check-errors/{inventoryItemId}")
    @PreAuthorize("hasAnyRole('ROLE_RECONCILE_INVENTORY', 'ROLE_REPORT')")
    @Operation(summary = "Vérifier les erreurs de saisie dans l'historique des sorties")
    public ResponseEntity<Response> checkForInputErrors(
            @PathVariable Long inventoryItemId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<StockMovement> movements = reconciliationService.checkForInputErrors(inventoryItemId, startDate, endDate);
        return new ResponseEntity<>(ResponseUtil.successResponse(movements), HttpStatus.OK);
    }
}

