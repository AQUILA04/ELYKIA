package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.entity.DailyOperationLog;
import com.optimize.elykia.core.service.DailyOperationService;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/daily-operations")
@RequiredArgsConstructor
public class DailyOperationController {

    private final DailyOperationService dailyOperationService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<DailyOperationLog>> getOperations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String commercialUsername,
            @PageableDefault(sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {

        User currentUser = userService.getCurrentUser();

        // Date Logic
        LocalDate start = startDate != null ? startDate : (date != null ? date : LocalDate.now());
        LocalDate end = endDate != null ? endDate : (date != null ? date : LocalDate.now());

        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return ResponseEntity
                    .ok(dailyOperationService.getOperations(start, end, currentUser.getUsername(), pageable));
        } else {
            if (commercialUsername != null && !commercialUsername.isEmpty()) {
                return ResponseEntity.ok(dailyOperationService.getOperations(start, end, commercialUsername, pageable));
            } else {
                return ResponseEntity.ok(dailyOperationService.getOperations(start, end, null, pageable));
            }
        }
    }
}
