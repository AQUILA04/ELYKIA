package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.entity.StockTontineReturn;
import com.optimize.elykia.core.service.StockTontineReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stock-tontine-return")
@RequiredArgsConstructor
public class StockTontineReturnController {

    private final StockTontineReturnService service;

    @PostMapping("/create")
    public ResponseEntity<StockTontineReturn> createReturn(@RequestBody StockTontineReturn stockReturn) {
        return ResponseEntity.ok(service.save(stockReturn));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockTontineReturn> validateReturn(@PathVariable Long id) {
        return ResponseEntity.ok(service.validate(id));
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<StockTontineReturn>> getByCollector(@PathVariable String collector, Pageable pageable) {
        // Note: Il faudra ajouter la méthode paginée dans le repository si elle n'existe pas
        // Pour l'instant, j'utilise une méthode hypothétique ou je dois mettre à jour le service/repo
        return ResponseEntity.ok(service.getByCollector(collector, pageable));
    }

    @GetMapping
    public ResponseEntity<Page<StockTontineReturn>> getAll(@RequestParam(required = false) String collector, Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, pageable));
    }
}
