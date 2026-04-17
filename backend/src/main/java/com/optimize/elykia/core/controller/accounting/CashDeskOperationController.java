package com.optimize.elykia.core.controller.accounting;

import com.lowagie.text.DocumentException;
import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.TicketingDto;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.elykia.core.service.report.PdfService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/cash-desks")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion de caisse")
@CrossOrigin
public class CashDeskOperationController {
    private final DailyAccountancyService dailyAccountancyService;
    private final PdfService pdfService;

    @GetMapping(value = "open")
    public ResponseEntity<Response> openCashDesk() {
        return new ResponseEntity<>(ResponseUtil.successResponse(dailyAccountancyService.initPromoterDailyAccountancy()), HttpStatus.OK);
    }

    @GetMapping(value = "is-opened")
    public ResponseEntity<Response> isOpenCAshDesk() {
        return new ResponseEntity<>(ResponseUtil.successResponse(dailyAccountancyService.isOpenCashDesk()), HttpStatus.OK);
    }

    @GetMapping(value = "print-daily-operation/pdf/{username}" )
    public Resource generateDailyOperationPdf(@PathVariable String username) throws DocumentException {
        return new InputStreamResource(pdfService.printDailyOperationPdf());
    }

    @PatchMapping(value = "ticketing")
    public ResponseEntity<Response> ticketing(@RequestBody @Valid TicketingDto ticketingDto) {
        return new ResponseEntity<>(ResponseUtil.successResponse(dailyAccountancyService.ticketing(ticketingDto)), HttpStatus.OK);
    }

    @GetMapping(value = "close")
    public ResponseEntity<Response> closeCashDesk() {
        return new ResponseEntity<>(ResponseUtil.successResponse(dailyAccountancyService.closeCashDesk()), HttpStatus.OK);
    }
}
