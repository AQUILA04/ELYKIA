package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.sale.RattrapageCreditDto;
import com.optimize.elykia.core.dto.stock.E2eSeedResidualStockDto;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.sale.RattrapageCreditService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Slf4j
@Tag(name = "API de gestion des rattrapages crédit vente")
@CrossOrigin
public class RattrapageCreditController {

    private final RattrapageCreditService rattrapageCreditService;
    private final CommercialMonthlyStockService commercialMonthlyStockService;

    /**
     * GET /api/v1/commercial-stock/residual?collector={username}
     * Retourne les stocks résiduels (mois antérieurs) d'un commercial ayant au moins un article restant.
     */
    @GetMapping("api/v1/commercial-stock/residual")
    public ResponseEntity<Response> getResidualStocks(@RequestParam String collector) {
        log.info("[RattrapageCreditController] GET /api/v1/commercial-stock/residual collector={}", collector);
        return new ResponseEntity<>(
                ResponseUtil.successResponse(rattrapageCreditService.getResidualStocks(collector)),
                HttpStatus.OK);
    }

    /**
     * POST /api/v1/credits/rattrapage
     * Crée un crédit de rattrapage à partir d'un stock résiduel antérieur.
     */
    @PostMapping("api/v1/credits/rattrapage")
    public ResponseEntity<Response> createRattrapage(@RequestBody @Valid RattrapageCreditDto dto) {
        log.info("[RattrapageCreditController] POST /api/v1/credits/rattrapage commercial={} clientId={}",
                dto.getCommercial(), dto.getClientId());
        return new ResponseEntity<>(
                ResponseUtil.successResponse(rattrapageCreditService.createRattrapage(dto)),
                HttpStatus.CREATED);
    }

    /**
     * POST /api/v1/commercial-stock/e2e/seed-residual
     * Prépare un stock résiduel du mois précédent (tests E2E rattrapage).
     */
    @PostMapping("api/v1/commercial-stock/e2e/seed-residual")
    public ResponseEntity<Response> seedResidualStockForE2e(@RequestBody @Valid E2eSeedResidualStockDto dto) {
        log.info("[RattrapageCreditController] POST /api/v1/commercial-stock/e2e/seed-residual collector={} articleId={}",
                dto.getCollector(), dto.getArticleId());
        return new ResponseEntity<>(
                ResponseUtil.successResponse(commercialMonthlyStockService.seedResidualStockForE2e(
                        dto.getCollector(), dto.getArticleId(), dto.getQuantity(), dto.getUnitPrice())),
                HttpStatus.CREATED);
    }
}
