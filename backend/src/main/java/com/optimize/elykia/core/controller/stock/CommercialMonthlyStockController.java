package com.optimize.elykia.core.controller.stock;

import com.optimize.elykia.core.dto.CommercialMonthlyStockItemSoldValueHistoryDto;
import com.optimize.elykia.core.dto.CommercialStockItemDto;
import com.optimize.elykia.core.dto.stock.StockLinkedSalesResponseDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.stock.CommercialMonthlyStockItemSoldValueHistoryService;
import com.optimize.elykia.core.service.stock.StockExportService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/commercial-stocks")
@CrossOrigin
public class CommercialMonthlyStockController {

    private final CommercialMonthlyStockRepository repository;
    private final CommercialMonthlyStockService monthlyStockService;
    private final CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService;
    private final StockExportService stockExportService;

    public CommercialMonthlyStockController(CommercialMonthlyStockRepository repository,
                                            CommercialMonthlyStockService monthlyStockService,
                                            CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService,
                                            StockExportService stockExportService) {
        this.repository = repository;
        this.monthlyStockService = monthlyStockService;
        this.soldValueHistoryService = soldValueHistoryService;
        this.stockExportService = stockExportService;
    }

    @GetMapping("/current/{collector}")
    public ResponseEntity<CommercialMonthlyStock> getCurrentMonthStock(@PathVariable String collector) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.of(monthlyStockService.findEnrichedByCollectorAndMonthAndYear(
                collector, now.getMonthValue(), now.getYear()));
    }

    @GetMapping("/{stockId}/linked-sales")
    public ResponseEntity<StockLinkedSalesResponseDto> getLinkedSales(@PathVariable Long stockId) {
        return ResponseEntity.ok(monthlyStockService.getLinkedSales(stockId));
    }
    
    @GetMapping("/{collector}/{year}/{month}")
    public ResponseEntity<CommercialMonthlyStock> getStockByDate(
            @PathVariable String collector,
            @PathVariable Integer year,
            @PathVariable Integer month) {
        return ResponseEntity.of(monthlyStockService.findEnrichedByCollectorAndMonthAndYear(collector, month, year));
    }

    @GetMapping("/available/{collector}")
    public ResponseEntity<List<CommercialStockItemDto>> getAvailableItems(@PathVariable String collector) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.ok(repository.findAvailableItemsByCollector(collector, now.getMonthValue(), now.getYear()));
    }

    @GetMapping("/items/{stockItemId}/sold-value-history")
    public ResponseEntity<List<CommercialMonthlyStockItemSoldValueHistoryDto>> getSoldValueHistory(
            @PathVariable Long stockItemId) {
        return ResponseEntity.ok(soldValueHistoryService.getByStockItemId(stockItemId));
    }

    @GetMapping
    public ResponseEntity<Page<CommercialMonthlyStock>> getAll(String collector, Pageable pageable, Boolean historic) {
        LocalDate now = LocalDate.now();
        return ResponseEntity.ok(monthlyStockService.getAll(collector, pageable, historic));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) String collector,
            @RequestParam Integer year,
            @RequestParam Integer month) {

        byte[] pdfContent = stockExportService.generateDashboardPdfExport(collector, year, month);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
                "attachment",
                "rapport-stock-commercial-" + collector + "-" + year + "-" + month + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok(pdfContent);
    }
}
