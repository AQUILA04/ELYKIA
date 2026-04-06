package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ElasticSearchWrapper;
import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.service.masterdata.LocalityService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/localities")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des localités de collecte")
@CrossOrigin
public class LocalityController {
    private final LocalityService localityService;

    @PostMapping
    public ResponseEntity<Response> createLocality(@RequestBody LocalityDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.createLocality(dto)), HttpStatus.CREATED);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> updateLocality(@RequestBody LocalityDto dto, @PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.updateLocality(dto, id)), HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.getAll(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.getAll()), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.deleteSoft(id)), HttpStatus.OK);
    }

    @PostMapping(value = "elasticsearch")
    public ResponseEntity<Response> elasticSearch(@RequestBody ElasticSearchWrapper wrapper, Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(localityService.elasticsearch(wrapper.getKeyword(), pageable)), HttpStatus.OK);
    }
}
