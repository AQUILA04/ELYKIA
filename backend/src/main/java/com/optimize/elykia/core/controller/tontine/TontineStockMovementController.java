package com.optimize.elykia.core.controller.tontine;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.TontineStockMovementDto;
import com.optimize.elykia.core.entity.stock.TontineStockMovement;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.service.stock.TontineStockMovementService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v1/tontines/stock/movements")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des mouvements de stock tontine")
@CrossOrigin
public class TontineStockMovementController {

    private final TontineStockMovementService tontineStockMovementService;

    @GetMapping("stock/{tontineStockId}")
    public ResponseEntity<Response> getMovementsByTontineStock(@PathVariable Long tontineStockId) {
        List<TontineStockMovementDto> dtos = tontineStockMovementService.getByTontineStock(tontineStockId).stream()
                .map(TontineStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }

    @GetMapping("credit/{creditId}")
    public ResponseEntity<Response> getMovementsByCredit(@PathVariable Long creditId) {
        List<TontineStockMovementDto> dtos = tontineStockMovementService.getByCredit(creditId).stream()
                .map(TontineStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }

    @GetMapping("collector/{collector}")
    public ResponseEntity<Response> getMovementsByCollector(@PathVariable String collector) {
        List<TontineStockMovementDto> dtos = tontineStockMovementService.getByCollector(collector).stream()
                .map(TontineStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }

    @GetMapping("collector/{collector}/type/{type}")
    public ResponseEntity<Response> getMovementsByCollectorAndType(
            @PathVariable String collector,
            @PathVariable TontineStockMovementType type) {
        List<TontineStockMovementDto> dtos = tontineStockMovementService.getByCollectorAndType(collector, type).stream()
                .map(TontineStockMovementDto::fromEntity)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(dtos), HttpStatus.OK);
    }
}
