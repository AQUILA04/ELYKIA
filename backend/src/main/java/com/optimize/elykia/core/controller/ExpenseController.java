package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Expense", description = "Management of expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    @Operation(summary = "Create a new expense")
    public ResponseEntity<Response> create(@RequestBody ExpenseDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.createExpense(dto)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing expense")
    public ResponseEntity<Response> update(@PathVariable Long id, @RequestBody ExpenseDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.updateExpense(dto, id)), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an expense")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.deleteSoft(id)), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an expense by ID")
    public ResponseEntity<Response> get(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.getByIdDto(id)), HttpStatus.OK);
    }

    @GetMapping
    @Operation(summary = "List expenses with pagination")
    public ResponseEntity<Response> list(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.getAllDto(pageable)), HttpStatus.OK);
    }
    
    @GetMapping("/dashboard-kpis")
    @Operation(summary = "Get expense KPIs for dashboard (This Week, This Month)")
    public ResponseEntity<Response> getDashboardKpis() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.getDashboardKpis()), HttpStatus.OK);
    }
    
    @GetMapping("/by-period")
    @Operation(summary = "Get expenses by period")
    public ResponseEntity<Response> getExpensesByPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(expenseService.getExpensesByPeriod(startDate, endDate)), HttpStatus.OK);
    }
}
