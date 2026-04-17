package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.sale.RecouvrementService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/recouvrements")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion générale des recouvrements")
@CrossOrigin
public class RecouvrementController {

    private final RecouvrementService recouvrementService;

    @GetMapping
    public ResponseEntity<Response> getAll(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String collector,
            Pageable pageable) {

        Sort sort = Sort.by(Sort.Direction.DESC, "createdDate");
        PageRequest pageRequest = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        return new ResponseEntity<>(
                ResponseUtil.successResponse(recouvrementService.getRecouvrements(dateFrom, dateTo, collector, pageRequest)),
                HttpStatus.OK
        );
    }

    @GetMapping("/summary")
    public ResponseEntity<Response> getSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String collector) {

        return new ResponseEntity<>(
                ResponseUtil.successResponse(recouvrementService.getRecouvrementSummary(dateFrom, dateTo, collector)),
                HttpStatus.OK
        );
    }
}
