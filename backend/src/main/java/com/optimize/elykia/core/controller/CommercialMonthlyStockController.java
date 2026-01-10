package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.dto.CommercialStockItemDto;
import com.optimize.elykia.core.entity.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/commercial-stocks")
public class CommercialMonthlyStockController {

    private final CommercialMonthlyStockRepository repository;

    public CommercialMonthlyStockController(CommercialMonthlyStockRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/current/{collector}")
    public ResponseEntity<CommercialMonthlyStock> getCurrentMonthStock(@PathVariable String collector) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.of(repository.findByCollectorAndMonthAndYear(collector, now.getMonthValue(), now.getYear()));
    }
    
    @GetMapping("/{collector}/{year}/{month}")
    public ResponseEntity<CommercialMonthlyStock> getStockByDate(
            @PathVariable String collector,
            @PathVariable Integer year,
            @PathVariable Integer month) {
        return ResponseEntity.of(repository.findByCollectorAndMonthAndYear(collector, month, year));
    }

    @GetMapping("/available/{collector}")
    public ResponseEntity<List<CommercialStockItemDto>> getAvailableItems(@PathVariable String collector) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.ok(repository.findAvailableItemsByCollector(collector, now.getMonthValue(), now.getYear()));
    }
}
