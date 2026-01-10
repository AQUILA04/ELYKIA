package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.dto.CommercialStockItemDto;
import com.optimize.elykia.core.entity.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.CommercialMonthlyStockService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/commercial-stocks")
public class CommercialMonthlyStockController {

    private final CommercialMonthlyStockRepository repository;
    private final CommercialMonthlyStockService monthlyStockService;

    public CommercialMonthlyStockController(CommercialMonthlyStockRepository repository,
                                            CommercialMonthlyStockService monthlyStockService) {
        this.repository = repository;
        this.monthlyStockService = monthlyStockService;
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

    @GetMapping
    public ResponseEntity<Page<CommercialMonthlyStock>> getAll(String collector, Pageable pageable, Boolean historic) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.ok(monthlyStockService.getAll(collector, pageable, historic));
    }
}
