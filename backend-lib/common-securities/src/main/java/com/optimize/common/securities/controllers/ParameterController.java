package com.optimize.common.securities.controllers;

import com.optimize.common.securities.models.Parameter;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.service.ParameterService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parameters")
@RequiredArgsConstructor
@CrossOrigin
public class ParameterController {

    private final ParameterService parameterService;

    @GetMapping("/key/{key}")
    public ResponseEntity<Parameter> getByKey(@PathVariable String key) {
        return parameterService.findByKey(key)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/enabled/{key}")
    public ResponseEntity<Boolean> isEnabled(@PathVariable String key) {
        return ResponseEntity.ok(parameterService.isEnabled(key));
    }

    @PostMapping
    public ResponseEntity<Parameter> create(@RequestBody Parameter parameter) {
        return ResponseEntity.ok(parameterService.create(parameter));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Parameter> update(@PathVariable Long id, @RequestBody Parameter parameter) {
        return ResponseEntity.ok(parameterService.update(id, parameter.getValue(), parameter.getDescription()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        parameterService.delete(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/all")
    public ResponseEntity<List<Parameter>> findAll() {
        return ResponseEntity.ok(parameterService.findAll());
    }

    @GetMapping
    public ResponseEntity<?> findAll(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(new MessageResponse("Parameters get successfully!", parameterService.findAll(page, size)));
    }
}
