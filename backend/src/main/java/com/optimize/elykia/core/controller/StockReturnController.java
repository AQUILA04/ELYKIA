package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.entity.StockReturn;
import com.optimize.elykia.core.service.stock.StockReturnService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stock-returns")
public class StockReturnController  {

    private final StockReturnService service;

    public StockReturnController(StockReturnService service) {
        this.service = service;
    }

    @PostMapping("/create")
    public ResponseEntity<StockReturn> createReturn(@RequestBody StockReturn stockReturn) {
        return ResponseEntity.ok(service.createReturn(stockReturn));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockReturn> validateReturn(@PathVariable Long id) {
        return ResponseEntity.ok(service.validateReturn(id));
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<StockReturn>> getByCollector(@PathVariable String collector, Pageable pageable) {
        return ResponseEntity.ok(((com.optimize.elykia.core.repository.StockReturnRepository)service.getRepository()).findByCollector(collector, pageable));
    }

    @GetMapping
    public ResponseEntity<Page<StockReturn>> getAll(String collector, Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, pageable));
    }
}
