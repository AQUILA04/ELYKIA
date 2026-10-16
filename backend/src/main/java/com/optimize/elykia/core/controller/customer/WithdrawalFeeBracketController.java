package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.customer.WithdrawalFeeBracketDto;
import com.optimize.elykia.core.service.customer.WithdrawalFeeBracketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mobile-money-withdrawal-fees")
@RequiredArgsConstructor
@CrossOrigin
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class WithdrawalFeeBracketController {

    private final WithdrawalFeeBracketService service;

    @GetMapping
    public ResponseEntity<Response> list() {
        return ResponseEntity.ok(ResponseUtil.successResponse(service.list()));
    }

    @PostMapping
    public ResponseEntity<Response> create(@Valid @RequestBody WithdrawalFeeBracketDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ResponseUtil.successResponse(service.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Response> update(@PathVariable Long id, @Valid @RequestBody WithdrawalFeeBracketDto request) {
        return ResponseEntity.ok(ResponseUtil.successResponse(service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
