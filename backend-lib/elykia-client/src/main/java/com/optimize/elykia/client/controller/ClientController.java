package com.optimize.elykia.client.controller;

import com.optimize.common.entities.util.ElasticSearchWrapper;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.client.dto.*;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.repository.spec.ClientSpecification;
import com.optimize.elykia.client.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/clients")
//@SecurityRequirement(name = "bearerAuth")
@Slf4j
//@Tag(name = "API de gestion des clients")
@CrossOrigin
public class ClientController {
    private final ClientService clientService;

    @PostMapping("/fetch")
    public ResponseEntity<Response> fetch(@RequestBody ClientSearchDto dto, Pageable pageable) {
        Page<Client> results = clientService.getRepository().findAll(ClientSpecification.from(dto), pageable);
        return new ResponseEntity<Response>(ResponseUtil.successResponse(results), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Response> create(@RequestBody @Valid ClientDto dto) {
        //dto.checkDocValue();
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.addClient(dto)), HttpStatus.CREATED);
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<Response> update(@RequestBody @Valid ClientDto dto, @PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.updateclient(dto, id)), HttpStatus.OK);
    }

    @PatchMapping(value = "location-update")
    public ResponseEntity<Response> updateLocation(@RequestBody @Valid LocationUpdate dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.updateClientLocation(dto)), HttpStatus.OK);
    }

    @PatchMapping(value = "photo-update")
    public ResponseEntity<Response> updatePhoto(@RequestBody @Valid UpdatePhotoDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.updateClientPhoto(dto)), HttpStatus.OK);
    }

    @PatchMapping(value = "update-photo-url")
    public ResponseEntity<Response> updatePhotoUrl(@RequestBody @Valid UpdatePhotoUrlDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.updateClientPhotoUrl(dto)), HttpStatus.OK);
    }

    @PatchMapping(value = "assign-collector")
    public ResponseEntity<Response> assignCollector(@RequestBody @Valid AssignCollectorDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.assignCollector(dto)), HttpStatus.OK);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable,
                                           @RequestParam(required = false) String username,
                                           @RequestParam(required = false) Boolean tontine,
                                           @RequestParam(required = false) Boolean mobile) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getAll(username, tontine, mobile, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getAll()), HttpStatus.OK);
    }

    @GetMapping(value = "by-operator/{operator}")
    public ResponseEntity<Response> getAllByOperator(@PathVariable String operator, Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getByOperator(operator, pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "by-commercial/{commercial}")
    public ResponseEntity<Response> getAllClientsByCommercial(@PathVariable String commercial, Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getAllClientByCollector(commercial, pageable)), HttpStatus.OK);
    }



    @GetMapping(value = "by-collector/{collector}")
    public ResponseEntity<Response> getAllByCollector(@PathVariable String collector) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getByCollector(collector)), HttpStatus.OK);
    }

    @GetMapping(value = "profil-photo/{id}")
    public ResponseEntity<Response> getClientProfilPhoto(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getProfilPhoto(id)), HttpStatus.OK);
    }

    @GetMapping(value = "card-photo/{id}")
    public ResponseEntity<Response> getClientCardPhoto(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.getCardPhoto(id)), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.deleteSoft(id)), HttpStatus.OK);
    }

    @PostMapping(value = "elasticsearch")
    public ResponseEntity<Response> elasticSearch(@RequestBody ElasticSearchWrapper wrapper, String username, Boolean tontine, Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(clientService.elasticsearch(wrapper.getKeyword(), username, tontine, pageable)), HttpStatus.OK);
    }

}
