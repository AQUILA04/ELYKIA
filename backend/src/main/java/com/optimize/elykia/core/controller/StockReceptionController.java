package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.stock.StockReceptionService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/stock-receptions")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des réceptions de stock")
@CrossOrigin
public class StockReceptionController {

    private final StockReceptionService service;

    @GetMapping
    public ResponseEntity<Response> getAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(service.getAllReceptions(startDate, endDate, pageable)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(service.getReceptionById(id)), HttpStatus.OK);
    }
}
