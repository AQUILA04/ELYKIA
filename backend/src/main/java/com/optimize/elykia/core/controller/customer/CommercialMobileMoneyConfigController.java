package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.customer.CommercialMobileMoneyConfigUpsertDto;
import com.optimize.elykia.core.service.customer.CommercialMobileMoneyConfigService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/commercial-mobile-money-config")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Commercial mobile money config")
@CrossOrigin
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class CommercialMobileMoneyConfigController {

    private final CommercialMobileMoneyConfigService service;

    @GetMapping
    public ResponseEntity<Response> listAll() {
        return ResponseEntity.ok(ResponseUtil.successResponse(service.listAll()));
    }

    @PutMapping("/{commercialUsername}")
    public ResponseEntity<Response> upsert(
            @PathVariable String commercialUsername,
            @Valid @RequestBody CommercialMobileMoneyConfigUpsertDto dto) {
        return ResponseEntity.ok(ResponseUtil.successResponse(service.upsert(commercialUsername, dto)));
    }
}
