package com.optimize.elykia.sale.web;

import com.optimize.elykia.sale.domain.StockRequest;
import com.optimize.elykia.sale.domain.StockRequestItem;
import java.util.List;
import com.optimize.elykia.sale.web.dto.PartialDeliveryResponseDTO;
import com.optimize.elykia.sale.domain.StockRequestStatus;
import com.optimize.elykia.sale.application.StockRequestService;
import com.optimize.elykia.sale.api.SalePdfExportPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import com.optimize.elykia.sale.web.dto.StockRequestCreateDto;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/stock-requests")
public class StockRequestController {

    private final StockRequestService service;
    private final SalePdfExportPort salePdfExportPort;
    private final com.optimize.elykia.sale.application.OrderStockRequestService orderStockRequestService;

    public StockRequestController(
            StockRequestService service,
            SalePdfExportPort salePdfExportPort,
            com.optimize.elykia.sale.application.OrderStockRequestService orderStockRequestService) {
        this.service = service;
        this.salePdfExportPort = salePdfExportPort;
        this.orderStockRequestService = orderStockRequestService;
    }

    @PostMapping("/create")
    public ResponseEntity<StockRequest> createRequest(@RequestBody StockRequestCreateDto dto) {
        StockRequest request = dto.getRequest();
        boolean forNextMonth = dto.getForNextMonth() != null ? dto.getForNextMonth() : false;
        return ResponseEntity.ok(service.createRequest(request, forNextMonth));
    }

    @PostMapping("/from-orders")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ORDER_STOCK_REQUEST + "')")
    public ResponseEntity<List<StockRequest>> createFromOrders(
            @RequestBody @jakarta.validation.Valid com.optimize.elykia.sale.web.dto.CreateStockRequestFromOrdersDto dto) {
        boolean forNextMonth = dto.getForNextMonth() != null && dto.getForNextMonth();
        return ResponseEntity.ok(orderStockRequestService.createFromOrders(dto.getOrderIds(), forNextMonth));
    }

    @GetMapping("/from-pending-orders/preview")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ORDER_STOCK_REQUEST + "')")
    public ResponseEntity<com.optimize.elykia.sale.web.dto.PendingOrderStockPreviewDto> previewPendingOrders(
            @RequestParam(required = false) com.optimize.elykia.sale.domain.OrderSource source) {
        return ResponseEntity.ok(orderStockRequestService.previewPending(source));
    }

    @PostMapping("/from-pending-orders")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.ORDER_STOCK_REQUEST + "')")
    public ResponseEntity<List<StockRequest>> createFromPendingOrders(
            @RequestBody(required = false) com.optimize.elykia.sale.web.dto.CreatePendingStockRequestDto dto) {
        boolean forNextMonth = dto != null && Boolean.TRUE.equals(dto.getForNextMonth());
        com.optimize.elykia.sale.domain.OrderSource source = dto == null ? null : dto.getSource();
        return ResponseEntity.ok(orderStockRequestService.createFromPending(source, forNextMonth));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StockRequest> updateRequest(@PathVariable Long id, @RequestBody StockRequest updateDto) {
        return ResponseEntity.ok(service.updateRequest(id, updateDto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockRequest> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<StockRequestItem>> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(service.getItemsById(id));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<StockRequest> validateRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.validateRequest(id));
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<PartialDeliveryResponseDTO> deliverRequest(@PathVariable Long id) {
        return ResponseEntity.ok(service.deliverRequest(id));
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
    public ResponseEntity<Page<StockRequest>> getByCollector(@PathVariable String collector, Pageable pageable) {
        return ResponseEntity.ok(((com.optimize.elykia.sale.infrastructure.persistence.StockRequestRepository) service.getRepository())
                .findByCollector(collector, pageable));
    }

    @GetMapping
    public ResponseEntity<Page<com.optimize.elykia.sale.web.dto.StockRequestListDto>> getAll(
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(service.getAll(collector, startDate, endDate, pageable));
    }

    @GetMapping("/kpis")
    public ResponseEntity<com.optimize.elykia.sale.web.dto.StockRequestKpiDto> getKpis(
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(service.getKpis(collector, startDate, endDate));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Page<StockRequest>> getByStatus(@PathVariable StockRequestStatus status, Pageable pageable) {
        return ResponseEntity.ok(((com.optimize.elykia.sale.infrastructure.persistence.StockRequestRepository) service.getRepository()).findByStatus(status, pageable));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String collector,
            @RequestParam(required = false) List<Long> requestIds) {

        byte[] pdfContent = salePdfExportPort.generateStockRequestSortiePdf(startDate, endDate, collector, requestIds);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "fiche-sortie-stock-" + LocalDate.now() + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfContent, headers, org.springframework.http.HttpStatus.OK);
    }
}
