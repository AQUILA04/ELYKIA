package com.optimize.elykia.core.controller.customer;

import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.service.customer.CustomerAuthService;
import com.optimize.elykia.core.service.masterdata.LocalityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer/auth")
@RequiredArgsConstructor
@CrossOrigin
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;
    private final LocalityService localityService;

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

    /** Référentiel public pour le sélecteur « Votre zone » à l'inscription. */
    @GetMapping("/localities")
    public ResponseEntity<List<LocalityDto>> listLocalities() {
        return ResponseEntity.ok(localityService.listEnabledForCustomer());
    }
}
