package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogDto;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogSearchCriteria;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogSummaryDto;
import com.optimize.elykia.core.service.customer.CustomerActivityLogService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/customer-activity-logs")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('" + UserPermissionConstant.AUDIT + "')")
public class CustomerActivityLogAdminController {

    private final CustomerActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String appVersion,
            @RequestParam(required = false) Integer httpStatus,
            @RequestParam(required = false) Integer httpStatusFrom,
            @RequestParam(required = false) Integer httpStatusTo,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) List<String> eventType,
            @PageableDefault(size = 50, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        CustomerActivityLogSearchCriteria criteria = buildCriteria(
                clientId, phone, deviceId, sessionId, from, to, category, source, platform,
                appVersion, httpStatus, httpStatusFrom, httpStatusTo, q, outcome, eventType);
        Page<CustomerActivityLogDto> page = activityLogService.search(criteria, pageable);
        return ResponseEntity.ok(ResponseUtil.successResponse(page));
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String appVersion,
            @RequestParam(required = false) Integer httpStatus,
            @RequestParam(required = false) Integer httpStatusFrom,
            @RequestParam(required = false) Integer httpStatusTo,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) List<String> eventType) {
        CustomerActivityLogSearchCriteria criteria = buildCriteria(
                clientId, phone, deviceId, sessionId, from, to, category, source, platform,
                appVersion, httpStatus, httpStatusFrom, httpStatusTo, q, outcome, eventType);
        CustomerActivityLogSummaryDto summary = activityLogService.summarize(criteria);
        return ResponseEntity.ok(ResponseUtil.successResponse(summary));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> sessionTimeline(
            @PathVariable String sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false, defaultValue = "500") int limit) {
        List<CustomerActivityLogDto> timeline = activityLogService.sessionTimeline(sessionId, from, to, limit);
        return ResponseEntity.ok(ResponseUtil.successResponse(timeline));
    }

    private static CustomerActivityLogSearchCriteria buildCriteria(
            Long clientId, String phone, String deviceId, String sessionId,
            Instant from, Instant to, String category, String source, String platform,
            String appVersion, Integer httpStatus, Integer httpStatusFrom, Integer httpStatusTo,
            String q, String outcome, List<String> eventType) {
        return CustomerActivityLogSearchCriteria.builder()
                .clientId(clientId)
                .phone(phone)
                .deviceId(deviceId)
                .sessionId(sessionId)
                .from(from)
                .to(to)
                .category(category)
                .source(source)
                .platform(platform)
                .appVersion(appVersion)
                .httpStatus(httpStatus)
                .httpStatusFrom(httpStatusFrom)
                .httpStatusTo(httpStatusTo)
                .q(q)
                .outcome(outcome)
                .eventTypes(eventType)
                .build();
    }
}
