package com.optimize.elykia.core.controller.carnet;

import com.optimize.elykia.core.dto.carnet.CarnetEcartBulkResultDto;
import com.optimize.elykia.core.dto.carnet.CarnetEcartItemDto;
import com.optimize.elykia.core.dto.carnet.CarnetEcartKeysRequest;
import com.optimize.elykia.core.enumaration.CarnetEcartDomain;
import com.optimize.elykia.core.service.carnet.CarnetEcartDecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/carnet-ecarts")
@CrossOrigin
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PROMOTER','GESTIONNAIRE','ADMIN','SUPER_ADMIN','ROOT')")
public class CarnetEcartController {

    private final CarnetEcartDecisionService decisionService;

    @GetMapping
    public ResponseEntity<List<CarnetEcartItemDto>> list(
            @RequestParam(required = false, defaultValue = "PENDING") String queue,
            @RequestParam(required = false) CarnetEcartDomain domain,
            @RequestParam(required = false) String commercial) {
        return ResponseEntity.ok(decisionService.list(queue, domain, commercial));
    }

    @PostMapping("/accept")
    public ResponseEntity<CarnetEcartBulkResultDto> accept(@RequestBody CarnetEcartKeysRequest request) {
        return ResponseEntity.ok(decisionService.accept(request != null ? request.getKeys() : null));
    }

    @PostMapping("/reject")
    public ResponseEntity<CarnetEcartBulkResultDto> reject(@RequestBody CarnetEcartKeysRequest request) {
        return ResponseEntity.ok(decisionService.reject(
                request != null ? request.getKeys() : null,
                request != null ? request.getNote() : null));
    }
}
