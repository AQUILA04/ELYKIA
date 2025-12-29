package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ExpenseTypeDto;
import com.optimize.elykia.core.service.ExpenseTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/expense-types")
@RequiredArgsConstructor
@Tag(name = "Expense Type", description = "Management of expense types")
public class ExpenseTypeController {

    private final ExpenseTypeService expenseTypeService;

    @PostMapping
    @Operation(summary = "Create a new expense type")
    public ResponseEntity<Response> create(@RequestBody ExpenseTypeDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseTypeService.createArticleType(dto)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing expense type")
    public ResponseEntity<Response> update(@PathVariable Long id, @RequestBody ExpenseTypeDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseTypeService.updateArticleType(dto, id)), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an expense type")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseTypeService.deleteSoft(id)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an expense type by ID")
    public ResponseEntity<Response> get(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseTypeService.getByIdDto(id)), HttpStatus.OK);
    }

    @GetMapping
    @Operation(summary = "List expense types with pagination")
    public ResponseEntity<Response> list(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseTypeService.getAllDto(pageable)), HttpStatus.OK);
    }
    
    @GetMapping("/all")
    @Operation(summary = "Get all expense types without pagination")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseTypeService.getAllDto()), HttpStatus.OK);
    }
}
