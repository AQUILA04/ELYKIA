package com.optimize.elykia.client.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.dto.AccountRespDto;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/accounts")
@Slf4j
@CrossOrigin
public class AccountController {
    private final AccountService accountService;

    @PostMapping
    public ResponseEntity<Response> createAccount(@RequestBody @Valid AccountDto accountDto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.createAccount(accountDto)), HttpStatus.CREATED);
    }

    @PostMapping(value = "sync")
    public ResponseEntity<Response> syncAccount(@RequestBody @Valid AccountDto accountDto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.syncAccount(accountDto)), HttpStatus.CREATED);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> updateAccount(@RequestBody @Valid AccountDto accountDto, @PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.updateAccount(accountDto, id)), HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.getById(id)), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.deleteSoft(id)), HttpStatus.OK);
    }

    // MODIFIÉ : La méthode accepte maintenant "search" au lieu de "username"
    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable, @RequestParam(name = "search", required = false, defaultValue = "") String searchTerm) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id").descending());
        // On passe le searchTerm au service
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.getAll(pageable, searchTerm)), HttpStatus.OK);
    }

    @GetMapping("by-commercial")
    public ResponseEntity<Response> getAllForCommercial(Pageable pageable, @RequestParam(name = "commercial", required = true, defaultValue = "") String commercial) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id").descending());
        // On passe le searchTerm au service
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.getAllForCommercial(commercial, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<>(ResponseUtil.successResponse(AccountRespDto.fromAccountList(accountService.getAll())), HttpStatus.OK);
    }

    @PostMapping(value = "activate/{id}")
    public ResponseEntity<Response> activate(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.changeStatus(id, AccountStatus.ACTIF)), HttpStatus.OK);
    }

    @PostMapping(value = "closed/{id}")
    public ResponseEntity<Response> closed(@PathVariable Long id) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountService.changeStatus(id, AccountStatus.CLOSED)), HttpStatus.OK);
    }
}
