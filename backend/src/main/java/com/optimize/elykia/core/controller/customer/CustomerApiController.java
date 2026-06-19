package com.optimize.elykia.core.controller.customer;

import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.service.customer.CustomerPortalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@CrossOrigin
@PreAuthorize("hasRole('ROLE_CLIENT')")
public class CustomerApiController {

    private final CustomerPortalService customerPortalService;

    @GetMapping("/dashboard")
    public ResponseEntity<CustomerDashboardDto> getDashboard() {
        return ResponseEntity.ok(customerPortalService.getDashboard());
    }

    @GetMapping("/purchases")
    public ResponseEntity<List<CustomerPurchaseDto>> getPurchases() {
        return ResponseEntity.ok(customerPortalService.getPurchases());
    }

    @GetMapping("/purchases/{id}")
    public ResponseEntity<CustomerPurchaseDto> getPurchase(@PathVariable Long id) {
        return ResponseEntity.ok(customerPortalService.getPurchase(id));
    }

    @GetMapping("/purchases/{id}/recoveries")
    public ResponseEntity<List<CustomerRecoveryDto>> getRecoveries(@PathVariable Long id) {
        return ResponseEntity.ok(customerPortalService.getRecoveries(id));
    }

    @PostMapping("/recoveries/mobile-money")
    public ResponseEntity<CustomerRecoveryDto> submitMobileMoney(@Valid @RequestBody CustomerMobileMoneyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerPortalService.submitMobileMoney(request));
    }

    @GetMapping("/articles")
    public ResponseEntity<List<CustomerArticleDto>> getArticles(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(customerPortalService.getArticles(search, category));
    }

    @PostMapping("/orders")
    public ResponseEntity<CustomerOrderResponse> submitOrder(@Valid @RequestBody CustomerOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerPortalService.submitOrder(request));
    }
}
