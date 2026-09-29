package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogDto;
import com.optimize.elykia.core.service.customer.CustomerActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/customer-activity-logs")
@RequiredArgsConstructor
public class CustomerActivityLogAdminController {

    private final CustomerActivityLogService activityLogService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            Pageable pageable) {
        // Auth required via Spring Security (any authenticated admin/staff user).
        userService.getCurrentUser();
        Page<CustomerActivityLogDto> page = activityLogService.search(
                clientId, phone, deviceId, sessionId, from, to, pageable);
        return ResponseEntity.ok(ResponseUtil.successResponse(page));
    }
}
