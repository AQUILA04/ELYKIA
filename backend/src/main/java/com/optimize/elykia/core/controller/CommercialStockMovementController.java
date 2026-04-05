package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.CommercialStockMovementDto;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v1/stock/movements")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des mouvements de stock commercial")
@CrossOrigin
public class CommercialStockMovementController {

    private final CommercialStockMovementService commercialStockMovementService;

    @GetMapping(value = "item/{stockItemId}")
    public ResponseEntity<Response> getMovementsByStockItem(@PathVariable Long stockItemId) {
        List<CommercialStockMovement> movements = commercialStockMovementService.getByStockItem(stockItemId);
        List<CommercialStockMovementDto> dtos = movements.stream()
                .map(CommercialStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }

    @GetMapping(value = "credit/{creditId}")
    public ResponseEntity<Response> getMovementsByCredit(@PathVariable Long creditId) {
        List<CommercialStockMovement> movements = commercialStockMovementService.getByCredit(creditId);
        List<CommercialStockMovementDto> dtos = movements.stream()
                .map(CommercialStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }

    @GetMapping(value = "collector/{collector}")
    public ResponseEntity<Response> getMovementsByCollector(@PathVariable String collector) {
        List<CommercialStockMovement> movements = commercialStockMovementService.getByCollectorAndType(collector, null);
        List<CommercialStockMovementDto> dtos = movements.stream()
                .map(CommercialStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }

    @GetMapping(value = "collector/{collector}/type/{type}")
    public ResponseEntity<Response> getMovementsByCollectorAndType(
            @PathVariable String collector,
            @PathVariable CommercialStockMovementType type) {
        List<CommercialStockMovement> movements = commercialStockMovementService.getByCollectorAndType(collector, type);
        List<CommercialStockMovementDto> dtos = movements.stream()
                .map(CommercialStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }
}
