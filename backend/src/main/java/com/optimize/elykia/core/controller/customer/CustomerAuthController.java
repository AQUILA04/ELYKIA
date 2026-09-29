package com.optimize.elykia.core.controller.customer;

import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.service.customer.CustomerActivityLogService;
import com.optimize.elykia.core.service.customer.CustomerAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/auth")
@RequiredArgsConstructor
@CrossOrigin
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;
    private final CustomerActivityLogService activityLogService;

    @GetMapping("/localities")
    public ResponseEntity<List<CustomerLocalityDto>> listLocalities() {
        return ResponseEntity.ok(customerAuthService.listLocalities());
    }

    @PostMapping("/check-phone")
    public ResponseEntity<CustomerCheckPhoneResponse> checkPhone(@Valid @RequestBody CustomerPhoneRequest request) {
        return ResponseEntity.ok(customerAuthService.checkPhone(request));
    }

    @PostMapping("/login")
    public ResponseEntity<CustomerLoginResponse> login(@Valid @RequestBody CustomerLoginRequest request) {
        return ResponseEntity.ok(customerAuthService.login(request));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<CustomerOtpSendResponse> sendOtp(@Valid @RequestBody CustomerPhoneRequest request) {
        return ResponseEntity.accepted().body(customerAuthService.sendOtp(request));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<CustomerOtpVerifyResponse> verifyOtp(@Valid @RequestBody CustomerOtpVerifyRequest request) {
        return ResponseEntity.ok(customerAuthService.verifyOtp(request));
    }

    @PostMapping("/setup-pin")
    public ResponseEntity<CustomerLoginResponse> setupPin(@Valid @RequestBody CustomerSetupPinRequest request) {
        return ResponseEntity.ok(customerAuthService.setupPin(request));
    }

    @PostMapping("/register")
    public ResponseEntity<CustomerLoginResponse> register(@Valid @RequestBody CustomerRegisterRequest request) {
        return ResponseEntity.ok(customerAuthService.register(request));
    }

    /**
     * Journal client (pré-auth inclus). {@code /api/customer/auth/**} est permitAll.
     * Le clientId n'est accepté que si un Bearer JWT valide est présent.
     */
    @PostMapping("/activity-logs")
    public ResponseEntity<Map<String, Object>> ingestActivityLogs(
            @Valid @RequestBody CustomerActivityLogBatchRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        int accepted = activityLogService.ingestClientBatch(request, authorization);
        return ResponseEntity.accepted().body(Map.of("accepted", accepted));
    }
}
