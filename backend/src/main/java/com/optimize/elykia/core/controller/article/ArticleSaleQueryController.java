package com.optimize.elykia.core.controller.article;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.sale.CashSalePricingService;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de consultation orientés vente/tarification exposés sous {@code /api/v1/articles},
 * conservés dans {@code core} (futur module {@code sale}) pour découpler le catalogue {@code inventory}.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/articles")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API de gestion des articles")
@CrossOrigin
public class ArticleSaleQueryController {

    private final CreditArticlesService creditArticlesService;
    private final CashSalePricingService cashSalePricingService;

    @GetMapping(value = "{id}/sale-offers")
    public ResponseEntity<Response> saleOffers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "CASH") String channel,
            @RequestParam(required = false) String commercial) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(cashSalePricingService.offers(id, channel, commercial)),
                HttpStatus.OK);
    }

    @GetMapping(value = "top-ten-articles")
    public ResponseEntity<Response> getTopTenSellArticle() {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(creditArticlesService.getTop10ArticlesWithHighestQuantity()),
                HttpStatus.OK);
    }
}
