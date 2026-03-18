package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.CreditLateSummaryDTO;
import com.optimize.elykia.core.service.CreditLateService;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/credits/late")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des retards crédits")
@RequiredArgsConstructor
@CrossOrigin
public class CreditLateController {

    private final CreditLateService creditLateService;

    @GetMapping
    public ResponseEntity<Response> getLateCredits(@RequestParam(required = false) String collector) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditLateService.getLateCredits(collector)), HttpStatus.OK);
    }

    @GetMapping("/summary")
    public ResponseEntity<Response> getSummary(@RequestParam(required = false) String collector) {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditLateService.getSummary(collector)), HttpStatus.OK);
    }

    @GetMapping("/collectors")
    public ResponseEntity<Response> getLateCollectors() {
        return new ResponseEntity<>(ResponseUtil.successResponse(creditLateService.getLateCollectors()), HttpStatus.OK);
    }
}
