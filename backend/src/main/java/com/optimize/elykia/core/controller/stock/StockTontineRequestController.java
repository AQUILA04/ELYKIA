package com.optimize.elykia.core.controller.stock;

import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;
import java.util.List;
import com.optimize.elykia.core.dto.PartialDeliveryResponseDTO;
import com.optimize.elykia.core.service.stock.StockExportService;
import com.optimize.elykia.core.service.stock.StockTontineRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/v1/stock-tontine-request")
@RequiredArgsConstructor
public class StockTontineRequestController {

    private final StockTontineRequestService service;
    private final StockExportService stockExportService;

    @PostMapping("/create")
    public ResponseEntity<StockTontineRequest> createRequest(@RequestBody StockTontineRequest request) {
        return ResponseEntity.ok(service.save(request));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockTontineRequest> validateRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.validate(id));
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<PartialDeliveryResponseDTO> deliverRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.deliver(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelRequest(@PathVariable Long id) {
        service.cancelRequest(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/refuse")
    public ResponseEntity<Void> refuseRequest(@PathVariable Long id) {
        service.refuseRequest(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<com.optimize.elykia.core.dto.stock.StockTontineRequestListDto>> getByCollector(@PathVariable String collector, Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockTontineRequest> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<StockTontineRequestItem>> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(service.getItemsById(id));
    }

    @GetMapping
    public ResponseEntity<Page<com.optimize.elykia.core.dto.stock.StockTontineRequestListDto>> getAll(
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, startDate, endDate, pageable));
    }

    @GetMapping("/kpis")
    public ResponseEntity<com.optimize.elykia.core.dto.stock.StockRequestKpiDto> getKpis(
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(service.getKpis(collector, startDate, endDate));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String collector) {

        byte[] pdfContent = stockExportService.generateStockTontineRequestSortiePdfExport(startDate, endDate, collector);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "fiche-sortie-stock-tontine-" + LocalDate.now() + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfContent, headers, org.springframework.http.HttpStatus.OK);
    }
}
