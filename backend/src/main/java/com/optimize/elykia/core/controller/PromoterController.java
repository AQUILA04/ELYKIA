package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.dto.PromoterDto;
import com.optimize.elykia.core.service.PromoterService;
import com.optimize.elykia.core.service.UserManagement;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/promoters")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des promoteurs")
@CrossOrigin
public class PromoterController {
    private final PromoterService promoterService;
    private final UserManagement userManagement;

    @PostMapping
    public ResponseEntity<Response> createPromoter(@RequestBody PromoterDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(promoterService.createPromoter(dto)), HttpStatus.CREATED);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> updatePromoter(@RequestBody PromoterDto dto, @PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(promoterService.updatePromoter(dto, id)), HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(promoterService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable) {
        List<User> users = userManagement.getPromoters();
        return new ResponseEntity<>(ResponseUtil.successResponse(new PageImpl<>(users, pageable, users.size())), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(userManagement.getPromoters()), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(promoterService.deleteSoft(id)), HttpStatus.OK);
    }
}
