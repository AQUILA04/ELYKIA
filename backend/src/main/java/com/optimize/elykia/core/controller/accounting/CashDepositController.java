package com.optimize.elykia.core.controller.accounting;

import com.optimize.elykia.core.dto.report.SurplusReallocationDto;
import com.optimize.elykia.core.dto.report.SurplusReallocationRequest;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.service.accounting.CashDepositService;
import com.optimize.elykia.core.service.accounting.CashSurplusReallocationService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/cash-deposits")
@RequiredArgsConstructor
@Slf4j
public class CashDepositController {

    private final CashDepositService cashDepositService;
    private final CashSurplusReallocationService surplusReallocationService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<CashDeposit> createDeposit(@RequestBody CashDeposit deposit) {
        return ResponseEntity.ok(cashDepositService.createDeposit(deposit));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<CashDeposit> cancelDeposit(@PathVariable Long id) {
        return ResponseEntity.ok(cashDepositService.cancelDeposit(id));
    }

    @GetMapping("/reallocate-surplus/preview")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_RAPPORT_JOURNALIER + "')")
    public ResponseEntity<SurplusReallocationDto> previewReallocateSurplus(
            @RequestParam String commercialUsername,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "false") boolean includeNewBalance,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) List<LocalDate> priorityDates) {
        return ResponseEntity.ok(surplusReallocationService.preview(
                commercialUsername, startDate, endDate, includeNewBalance, priorityDates));
    }

    @PostMapping("/reallocate-surplus")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_RAPPORT_JOURNALIER + "')")
    public ResponseEntity<SurplusReallocationDto> reallocateSurplus(@RequestBody SurplusReallocationRequest request) {
        return ResponseEntity.ok(surplusReallocationService.reallocate(
                request.getCommercialUsername(),
                request.getStartDate(),
                request.getEndDate(),
                Boolean.TRUE.equals(request.getIncludeNewBalance()),
                request.getPriorityDates()));
    }

    @GetMapping("/surplus-reallocations")
    @PreAuthorize("hasAuthority('" + UserPermissionConstant.KPI_FINANCIER_RAPPORT_JOURNALIER + "')")
    public ResponseEntity<List<SurplusReallocationDto>> listSurplusReallocations(
            @RequestParam String commercialUsername,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(surplusReallocationService.listForPeriod(commercialUsername, startDate, endDate));
    }

    @GetMapping
    public ResponseEntity<Page<CashDeposit>> getDeposits(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String commercialUsername,
            @PageableDefault(size = 20, sort = "date", direction = Sort.Direction.DESC) Pageable pageable) {

        User currentUser = userService.getCurrentUser();

        // Handle single date param for backward compatibility
        LocalDate start = startDate != null ? startDate : date;
        LocalDate end = endDate != null ? endDate : date;

        // Ensure default date range if everything is null (e.g. today)
        if (start == null)
            start = LocalDate.now();
        if (end == null)
            end = LocalDate.now();

        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return ResponseEntity.ok(cashDepositService.getDeposits(start, end, currentUser.getUsername(), pageable));
        } else {
            if (commercialUsername != null && !commercialUsername.isEmpty()) {
                return ResponseEntity.ok(cashDepositService.getDeposits(start, end, commercialUsername, pageable));
            } else {
                return ResponseEntity.ok(cashDepositService.getDeposits(start, end, null, pageable));
            }
        }
    }
}
