package com.optimize.elykia.core.controller.stock;

import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.entity.stock.StockTontineReturnItem;
import java.util.List;
import com.optimize.elykia.core.service.stock.StockExportService;
import com.optimize.elykia.core.service.stock.StockTontineReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/stock-tontine-return")
@RequiredArgsConstructor
public class StockTontineReturnController {

    private final StockTontineReturnService service;
    private final StockExportService stockExportService;

    @PostMapping("/create")
    public ResponseEntity<StockTontineReturn> createReturn(@RequestBody StockTontineReturn stockReturn) {
        return ResponseEntity.ok(service.save(stockReturn));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockTontineReturn> validateReturn(@PathVariable Long id) {
        return ResponseEntity.ok(service.validate(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelReturn(@PathVariable Long id) {
        service.cancelReturn(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<StockTontineReturn>> getByCollector(@PathVariable String collector, Pageable pageable) {
        // Note: Il faudra ajouter la méthode paginée dans le repository si elle n'existe pas
        // Pour l'instant, j'utilise une méthode hypothétique ou je dois mettre à jour le service/repo
        return ResponseEntity.ok(service.getByCollector(collector, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockTontineReturn> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<StockTontineReturnItem>> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(service.getItemsById(id));
    }

    @GetMapping
    public ResponseEntity<Page<com.optimize.elykia.core.dto.stock.StockTontineReturnListDto>> getAll(
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

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) List<Long> requestIds) {

        byte[] pdfContent = stockExportService.generateStockTontineReturnPdfExport(startDate, endDate, collector, requestIds);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "fiche-retours-stock-tontine-" + LocalDate.now() + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfContent, headers, org.springframework.http.HttpStatus.OK);
    }
}
