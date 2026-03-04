package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.entity.StockRequest;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.service.stock.StockRequestService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/stock-requests")
public class StockRequestController {

    private final StockRequestService service;

    public StockRequestController(StockRequestService service) {
        this.service = service;
    }

    @PostMapping("/create")
    public ResponseEntity<StockRequest> createRequest(@RequestBody StockRequest request) {
        return ResponseEntity.ok(service.createRequest(request));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockRequest> validateRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.validateRequest(id));
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<StockRequest> deliverRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.deliverRequest(id));
    }

    @GetMapping("/collector/{collector}")
    public ResponseEntity<Page<StockRequest>> getByCollector(@PathVariable String collector, Pageable pageable) {
        return ResponseEntity.ok(((com.optimize.elykia.core.repository.StockRequestRepository) service.getRepository())
                .findByCollector(collector, pageable));
    }

    @GetMapping
    public ResponseEntity<Page<StockRequest>> getAll(String collector, Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, pageable));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Page<StockRequest>> getByStatus(@PathVariable StockRequestStatus status, Pageable pageable) {
        return ResponseEntity.ok(((com.optimize.elykia.core.repository.StockRequestRepository) service.getRepository()).findByStatus(status, pageable));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String collector) {

        byte[] pdfContent = service.generatePdfExport(startDate, endDate, collector);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "stock-export-" + LocalDate.now() + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfContent, headers, org.springframework.http.HttpStatus.OK);
    }
}
