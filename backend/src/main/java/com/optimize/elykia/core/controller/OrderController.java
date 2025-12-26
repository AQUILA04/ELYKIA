package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.OrderDto;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.service.OrderService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.optimize.elykia.core.dto.UpdateOrderStatusDto;

import com.lowagie.text.DocumentException;
import com.optimize.elykia.core.service.PdfService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/orders")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des commandes")
@CrossOrigin
public class OrderController {

    private final OrderService orderService;
    private final PdfService pdfService;

    @PostMapping
    public ResponseEntity<Response> createOrder(@RequestBody @Valid OrderDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.createOrder(dto)), HttpStatus.CREATED);
    }

    @GetMapping("/reports/restock-needed")
    public ResponseEntity<Resource> getRestockNeededReport() throws DocumentException {
        InputStreamResource resource = new InputStreamResource(pdfService.generateRestockNeededPdf());
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rapport_reapprovisionnement.pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }


    @GetMapping
    public ResponseEntity<Response> getAllOrders(@RequestParam(required = false) OrderStatus status, Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.getAllOrders(status, pageable)), HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Response> updatePendingOrder(@PathVariable Long id, @RequestBody @Valid OrderDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.updatePendingOrder(id, dto)), HttpStatus.OK);
    }

    @PatchMapping("/status")
    public ResponseEntity<Response> updateOrderStatus(@RequestBody @Valid UpdateOrderStatusDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.updateOrderStatus(dto)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response> getOrderById(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.getById(id)), HttpStatus.OK);
    }

    @GetMapping("/by-client/{clientId}")
    public ResponseEntity<Response> getOrdersByClient(@PathVariable Long clientId, Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.getRepository().findByClient_Id(clientId, pageable)), HttpStatus.OK);
    }

    @GetMapping("/items/summary")
    public ResponseEntity<Response> getAcceptedArticleSummary(@RequestParam(required = false) String commercialUsername, Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.getAcceptedArticleSummary(commercialUsername, pageable)), HttpStatus.OK);
    }

    @PostMapping("/{id}/sell")
    public ResponseEntity<Response> sellOrder(@PathVariable Long id) throws Exception {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.soldOrder(id)), HttpStatus.CREATED);
    }

    @GetMapping("/kpis")
    public ResponseEntity<Response> getOrderKpis() {
        return new ResponseEntity<>(ResponseUtil.successResponse(orderService.getOrderKpis()), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Response> deleteOrder(@PathVariable Long id) {
        orderService.deleteSoft(id);
        return new ResponseEntity<>(ResponseUtil.successResponse("Order deleted successfully."), HttpStatus.OK);
    }
}
