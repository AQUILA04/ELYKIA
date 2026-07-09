package com.optimize.elykia.core.controller.stock;

import com.optimize.elykia.core.entity.stock.StockReturn;
import com.optimize.elykia.core.entity.stock.StockReturnItem;
import java.util.List;
import com.optimize.elykia.core.service.stock.StockReturnService;
import org.springframework.data.domain.Page;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.stock.StockReturnDto;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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

    @PostMapping(value = { "/historique", "/v1/historique" })
    public ResponseEntity<Response> createHistoriqueReturn(@RequestBody @Valid StockReturnDto dto) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(service.createHistoriqueReturn(dto)),
                HttpStatus.CREATED);
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockReturn> validateReturn(@PathVariable Long id) {
        return ResponseEntity.ok(service.validateReturn(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelReturn(@PathVariable Long id) {
        service.cancelReturn(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/refuse")
    public ResponseEntity<Void> refuseReturn(@PathVariable Long id) {
        service.refuseReturn(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<StockReturn>> getByCollector(@PathVariable String collector, Pageable pageable) {
        return ResponseEntity.ok(((com.optimize.elykia.core.repository.StockReturnRepository)service.getRepository()).findByCollector(collector, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockReturn> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<StockReturnItem>> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(service.getItemsById(id));
    }

    @GetMapping
    public ResponseEntity<Page<com.optimize.elykia.core.dto.stock.StockReturnListDto>> getAll(
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, startDate, endDate, pageable));
    }

    @GetMapping("/kpis")
    public ResponseEntity<com.optimize.elykia.core.dto.stock.StockReturnKpiDto> getKpis(
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(service.getKpis(collector, startDate, endDate));
    }
}
