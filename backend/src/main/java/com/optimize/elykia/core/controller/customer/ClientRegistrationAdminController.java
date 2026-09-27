package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.core.dto.customer.ClientRegistrationActivateRequest;
import com.optimize.elykia.core.dto.customer.ClientRegistrationDto;
import com.optimize.elykia.core.dto.customer.ClientRegistrationRejectRequest;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositDto;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositRejectRequest;
import com.optimize.elykia.core.service.customer.ClientRegistrationAdminService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/client-registrations")
@RequiredArgsConstructor
@CrossOrigin
public class ClientRegistrationAdminController {

    private final ClientRegistrationAdminService registrationAdminService;
    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.CONSULT_CLIENT + "', '"
            + UserPermissionConstant.EDIT_CLIENT + "', '"
            + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<?> list(
            @RequestParam(required = false) ClientActivationStatus status,
            @RequestParam(required = false) Boolean hasInitialDeposit,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ClientRegistrationDto> page = registrationAdminService.list(status, hasInitialDeposit, pageable);
        return ResponseEntity.ok(ResponseUtil.successResponse(page));
    }

    @GetMapping("/{clientId}")
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.CONSULT_CLIENT + "', '"
            + UserPermissionConstant.EDIT_CLIENT + "', '"
            + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<?> get(@PathVariable Long clientId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(registrationAdminService.get(clientId)));
    }

    @PostMapping("/{clientId}/activate")
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<?> activate(
            @PathVariable Long clientId,
            @Valid @RequestBody ClientRegistrationActivateRequest request) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(ResponseUtil.successResponse(
                registrationAdminService.activate(user, clientId, request)));
    }

    @PostMapping("/{clientId}/reject")
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<?> reject(
            @PathVariable Long clientId,
            @Valid @RequestBody ClientRegistrationRejectRequest request) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(ResponseUtil.successResponse(
                registrationAdminService.reject(user, clientId, request)));
    }

    @PostMapping("/initial-deposits/{depositId}/validate")
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<?> validateDeposit(@PathVariable Long depositId) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(ResponseUtil.successResponse(
                registrationAdminService.validateDeposit(user, depositId)));
    }

    @PostMapping("/initial-deposits/{depositId}/reject")
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.ADMIN + "')")
    public ResponseEntity<?> rejectDeposit(
            @PathVariable Long depositId,
            @RequestBody(required = false) CustomerInitialDepositRejectRequest request) {
        User user = userService.getCurrentUser();
        CustomerInitialDepositRejectRequest body =
                request != null ? request : new CustomerInitialDepositRejectRequest();
        return ResponseEntity.ok(ResponseUtil.successResponse(
                registrationAdminService.rejectDeposit(user, depositId, body)));
    }
}
