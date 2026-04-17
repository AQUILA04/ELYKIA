package com.optimize.elykia.core.controller.accounting;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.CloseCollectorOperationDto;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.optimize.elykia.core.service.accounting.DailyAccountancyService;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/accounting-days")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des journées comptables")
@CrossOrigin
public class AccountingDayController {

    private final AccountingDayService accountingDayService;
    private final DailyAccountancyService dailyAccountancyService;

    @GetMapping(value = "open-cash-desks")
    public ResponseEntity<Response> getOpenCashDesks() {
        return new ResponseEntity<>(ResponseUtil.successResponse(dailyAccountancyService.getOpenCashDesks()), HttpStatus.OK);
    }


    @GetMapping(value = "open")
    public ResponseEntity<Response> openAccountingDay() {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.openAccountingDay()), HttpStatus.OK);
    }

    @GetMapping(value = "is-opened")
    public ResponseEntity<Response> hasOpenedDay() {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.hasOpenedDay()), HttpStatus.OK);
    }

    @GetMapping(value = "current")
    public ResponseEntity<Response> getCurrentAccountingDay() {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.getCurrentAccountingDate()), HttpStatus.OK);
    }

    @GetMapping(value = "close")
    public ResponseEntity<Response> closeAccountingDay() {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.closeAccountingDay()), HttpStatus.OK);
    }

    @GetMapping(value = "accounting-history")
    public ResponseEntity<Response> getAllDailyAccounting(Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.getAllDailyAccounting(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "accounting-history-details/{dailyAccountingId}")
    public ResponseEntity<Response> getAllDailyAccountingDetails(@PathVariable Long dailyAccountingId, Pageable pageable) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.getDailyAccountingService()
                .getDailyAccountingDetails(dailyAccountingId, pageable)), HttpStatus.OK);
    }

    @PostMapping(value = "close-collector-operation")
    public ResponseEntity<Response> closeCollectorOperation(@RequestBody @Valid CloseCollectorOperationDto dto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(accountingDayService.closeCollectorOperation(dto)), HttpStatus.OK);
    }
}
