package com.optimize.elykia.core.controller.customer;

import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.service.customer.CustomerAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer/auth")
@RequiredArgsConstructor
@CrossOrigin
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;

    @PostMapping("/check-phone")
    public ResponseEntity<CustomerCheckPhoneResponse> checkPhone(@Valid @RequestBody CustomerPhoneRequest request) {
        return ResponseEntity.ok(customerAuthService.checkPhone(request));
    }

    @PostMapping("/login")
    public ResponseEntity<CustomerLoginResponse> login(@Valid @RequestBody CustomerLoginRequest request) {
        return ResponseEntity.ok(customerAuthService.login(request));
    }

    @PostMapping("/setup-pin")
    public ResponseEntity<CustomerLoginResponse> setupPin(@Valid @RequestBody CustomerSetupPinRequest request) {
        return ResponseEntity.ok(customerAuthService.setupPin(request));
    }
}
