package com.optimize.elykia.core.controller.agency;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.agency.AgencyWeeklyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/agency-weekly-reports")
@RequiredArgsConstructor
@CrossOrigin
public class AgencyWeeklyReportController {
    private final AgencyWeeklyReportService agencyWeeklyReportService;

    @GetMapping(value = "{id}")
    public ResponseEntity<Response> getOne(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyWeeklyReportService.getById(id)), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<Response> getAll(Pageable pageable) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyWeeklyReportService.getAll(pageable)), HttpStatus.OK);
    }

    @GetMapping(value = "all")
    public ResponseEntity<Response> getAll() {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyWeeklyReportService.getAll()), HttpStatus.OK);
    }

    @DeleteMapping(value = "{id}")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        return new ResponseEntity<Response>(ResponseUtil.successResponse(agencyWeeklyReportService.deleteSoft(id)), HttpStatus.OK);
    }
}
