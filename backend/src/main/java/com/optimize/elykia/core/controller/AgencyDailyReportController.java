package com.optimize.elykia.core.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.AgencyDailyReportDto;
import com.optimize.elykia.core.service.AgencyDailyReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/agency-daily-reports")
@RequiredArgsConstructor
@CrossOrigin
public class AgencyDailyReportController {
    private final AgencyDailyReportService agencyDailyReportService;

    @PostMapping
    public ResponseEntity<Response> create(@RequestBody @Valid AgencyDailyReportDto dto) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyDailyReportService.createDailyReport(dto)), HttpStatus.CREATED);
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyDailyReportService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyDailyReportService.getAll(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyDailyReportService.getAll()), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyDailyReportService.deleteSoft(id)), HttpStatus.OK);
    }
}
