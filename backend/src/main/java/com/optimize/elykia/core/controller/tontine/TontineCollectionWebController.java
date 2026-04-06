package com.optimize.elykia.core.controller.tontine;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.TontineCollectionKpiDto;
import com.optimize.elykia.core.dto.TontineCollectionWebDto;
import com.optimize.elykia.core.service.tontine.TontineCollectionWebService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/v1/tontine-collections/web")
@RequiredArgsConstructor
@Slf4j
public class TontineCollectionWebController {

    private final TontineCollectionWebService service;

    @GetMapping("/list")
    public ResponseEntity<Response> getCollections(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String collector,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        log.info("REST request to get Tontine Collections between {} and {} for collector {}", dateFrom, dateTo, collector);

        LocalDateTime startDateTime = (dateFrom != null) ? dateFrom.atStartOfDay() : LocalDate.now().atStartOfDay();
        LocalDateTime endDateTime = (dateTo != null) ? dateTo.atTime(LocalTime.MAX) : LocalDate.now().atTime(LocalTime.MAX);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "collectionDate"));

        Page<TontineCollectionWebDto> result = service.getCollectionsForWeb(startDateTime, endDateTime, collector, pageable);

        return new ResponseEntity<>(
                ResponseUtil.successResponse(result),
                HttpStatus.OK
        );
    }

    @GetMapping("/summary")
    public ResponseEntity<Response> getKpiSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String collector
    ) {
        log.info("REST request to get Tontine Collection KPI between {} and {} for collector {}", dateFrom, dateTo, collector);

        LocalDateTime startDateTime = (dateFrom != null) ? dateFrom.atStartOfDay() : LocalDate.now().atStartOfDay();
        LocalDateTime endDateTime = (dateTo != null) ? dateTo.atTime(LocalTime.MAX) : LocalDate.now().atTime(LocalTime.MAX);

        TontineCollectionKpiDto kpi = service.getKpiSummary(startDateTime, endDateTime, collector);

        return new ResponseEntity<>(
                ResponseUtil.successResponse(kpi),
                HttpStatus.OK
        );
    }
}
