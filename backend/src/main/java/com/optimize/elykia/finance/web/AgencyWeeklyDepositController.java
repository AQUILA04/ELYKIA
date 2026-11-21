package com.optimize.elykia.finance.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.finance.web.dto.AgencyWeeklyDepositDto;
import com.optimize.elykia.finance.application.AgencyWeeklyDepositService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/agency-weekly-deposits")
@RequiredArgsConstructor
@CrossOrigin
public class AgencyWeeklyDepositController {
    private final AgencyWeeklyDepositService agencyWeeklyDepositService;

    @PostMapping
    public ResponseEntity<Response> create(@RequestBody @Valid AgencyWeeklyDepositDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyWeeklyDepositService.makeWeeklyDeposit(dto)), HttpStatus.CREATED);
    }
}
