package com.optimize.elykia.core.controller.portfolio;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.portfolio.FormerPortfolioService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/former-portfolio")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Ancien portefeuille commercial")
@CrossOrigin
public class FormerPortfolioController {

    private final FormerPortfolioService formerPortfolioService;

    @GetMapping("/tontine/members")
    public ResponseEntity<Response> formerTontineMembers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String commercial) {
        return ok(formerPortfolioService.listFormerTontineMembers(page(page, size), commercial));
    }

    @GetMapping("/tontine/members/{memberId}")
    public ResponseEntity<Response> formerTontineMember(
            @PathVariable Long memberId,
            @RequestParam(required = false) String commercial) {
        return ok(formerPortfolioService.getFormerTontineMember(memberId, commercial));
    }

    @GetMapping("/credits")
    public ResponseEntity<Response> formerCredits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ok(formerPortfolioService.listFormerCredits(page(page, size)));
    }

    @GetMapping("/credits/{creditId}")
    public ResponseEntity<Response> formerCredit(@PathVariable Long creditId) {
        return ok(formerPortfolioService.getFormerCredit(creditId));
    }

    @GetMapping("/agency")
    public ResponseEntity<Response> formerAgency(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ok(formerPortfolioService.listFormerAgencyClients(page(page, size)));
    }

    @GetMapping("/agency/{clientId}")
    public ResponseEntity<Response> formerAgencyClient(@PathVariable Long clientId) {
        return ok(formerPortfolioService.getFormerAgencyClient(clientId));
    }

    @GetMapping("/sync")
    public ResponseEntity<Response> sync() {
        return ok(formerPortfolioService.sync());
    }

    private static ResponseEntity<Response> ok(Object body) {
        return new ResponseEntity<>(ResponseUtil.successResponse(body), HttpStatus.OK);
    }

    private static Pageable page(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        return PageRequest.of(safePage, safeSize);
    }
}
