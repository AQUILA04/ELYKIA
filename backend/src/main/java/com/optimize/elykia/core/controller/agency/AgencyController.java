package com.optimize.elykia.core.controller.agency;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.AgencyDto;
import com.optimize.elykia.core.service.agency.AgencyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/agencies")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "API de gestion des agences")
@CrossOrigin
public class AgencyController {
    private final AgencyService agencyService;

    @PostMapping
    public ResponseEntity<Response> create(@RequestBody @Valid AgencyDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyService.create(dto)), HttpStatus.CREATED);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> update(@RequestBody  @Valid AgencyDto dto, @PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyService.update(id, dto)), HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyService.getAll(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyService.getAll()), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyService.deleteSoft(id)), HttpStatus.OK);
    }


}
