package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.entity.CashDeposit;
import com.optimize.elykia.core.service.accounting.CashDepositService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import org.springframework.http.ResponseEntity;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/cash-deposits")
@RequiredArgsConstructor
@Slf4j
public class CashDepositController {

    private final CashDepositService cashDepositService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<CashDeposit> createDeposit(@RequestBody CashDeposit deposit) {
        return ResponseEntity.ok(cashDepositService.createDeposit(deposit));
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
