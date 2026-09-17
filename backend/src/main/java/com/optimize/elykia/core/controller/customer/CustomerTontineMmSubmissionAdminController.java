package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.customer.CustomerTontineMmSubmissionDto;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.service.customer.CustomerTontineMmSubmissionAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer-tontine-mm-submissions")
@RequiredArgsConstructor
public class CustomerTontineMmSubmissionAdminController {

    private final CustomerTontineMmSubmissionAdminService adminService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) CustomerSubmissionStatus status,
            Pageable pageable) {
        User user = userService.getCurrentUser();
        Page<CustomerTontineMmSubmissionDto> page = adminService.list(user, status, pageable);
        return ResponseEntity.ok(ResponseUtil.successResponse(page));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<?> validate(@PathVariable Long id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(ResponseUtil.successResponse(adminService.validate(user, id)));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(ResponseUtil.successResponse(adminService.reject(user, id)));
    }
}
