package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.entity.StockTontineRequest;
import com.optimize.elykia.core.service.StockTontineRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stock-tontine-request")
@RequiredArgsConstructor
public class StockTontineRequestController {

    private final StockTontineRequestService service;

    @PostMapping("/create")
    public ResponseEntity<StockTontineRequest> createRequest(@RequestBody StockTontineRequest request) {
        return ResponseEntity.ok(service.save(request));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockTontineRequest> validateRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.validate(id));
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<StockTontineRequest> deliverRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.deliver(id));
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<StockTontineRequest>> getByCollector(@PathVariable String collector, Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, pageable));
    }

    @GetMapping
    public ResponseEntity<Page<StockTontineRequest>> getAll(@RequestParam(required = false) String collector, Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, pageable));
    }
}
