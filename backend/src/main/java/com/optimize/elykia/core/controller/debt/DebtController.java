package com.optimize.elykia.core.controller.debt;

import com.optimize.elykia.core.dto.debt.*;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import com.optimize.elykia.core.service.debt.DebtService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/debts")
@CrossOrigin
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    @GetMapping
    public ResponseEntity<Page<DebtDocumentDto>> search(
            @RequestParam(required = false) String holder,
            @RequestParam(required = false) DebtType type,
            @RequestParam(required = false) DebtStatus status,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            Pageable pageable) {
        return ResponseEntity.ok(debtService.search(holder, type, status, year, month, pageable));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.DEBT_MANAGEMENT + "','" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<DebtSummaryDto> summary() {
        return ResponseEntity.ok(debtService.summary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DebtDocumentDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(debtService.getById(id));
    }

    @GetMapping("/by-stock/{stockId}")
    public ResponseEntity<DebtDocumentDto> byStock(@PathVariable Long stockId) {
        return debtService.findActiveMerchandiseDtoForStock(stockId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/merchandise")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.DEBT_MANAGEMENT + "','" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<DebtDocumentDto> createMerchandise(
            @Valid @RequestBody CreateMerchandiseDebtRequestDto request) {
        return ResponseEntity.ok(debtService.createMerchandiseDebt(request.getMonthlyStockId()));
    }

    @PostMapping("/cash")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.DEBT_MANAGEMENT + "','" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<DebtDocumentDto> createCash(@Valid @RequestBody CreateCashDebtRequestDto request) {
        return ResponseEntity.ok(debtService.createCashDebt(request));
    }

    @PostMapping("/{id}/recalculate")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.DEBT_MANAGEMENT + "','" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<DebtDocumentDto> recalculate(@PathVariable Long id) {
        return ResponseEntity.ok(debtService.recalculateCashDebt(id));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.DEBT_MANAGEMENT + "','" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<DebtDocumentDto> cancel(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(debtService.cancelDebt(id, reason));
    }

    @PostMapping("/settle")
    @PreAuthorize("hasAnyAuthority('" + UserPermissionConstant.DEBT_MANAGEMENT + "','" + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<DebtSettlementDto> settle(@Valid @RequestBody DebtSettleRequestDto request) {
        return ResponseEntity.ok(debtService.settle(request));
    }
}
