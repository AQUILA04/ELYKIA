package com.optimize.elykia.core.controller.stock;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.stock.ArticleStockLotDto;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.service.stock.FifoStockActivationService;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/stock/fifo")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "API valorisation FIFO stock magasin")
@CrossOrigin
public class StockFifoController {

    private final StockValuationFacade stockValuationFacade;
    private final FifoStockActivationService fifoStockActivationService;
    private final ArticleStockLotRepository articleStockLotRepository;

    @PostMapping("/activate")
    public ResponseEntity<Response> activate() {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(fifoStockActivationService.activate()),
                HttpStatus.OK);
    }

    @GetMapping("/valuation")
    public ResponseEntity<Response> getValuationSummary() {
        if (!stockValuationFacade.isFifoEnabled()) {
            return new ResponseEntity<>(
                    ResponseUtil.successResponse(Map.of("fifoEnabled", false)),
                    HttpStatus.OK);
        }
        return new ResponseEntity<>(
                ResponseUtil.successResponse(Map.of(
                        "fifoEnabled", true,
                        "purchaseTotal", stockValuationFacade.getTotalStockValuation(),
                        "creditSaleTotal", stockValuationFacade.getCreditSaleValuationFromLots(),
                        "sellingSaleTotal", stockValuationFacade.getSellingSaleValuationFromLots())),
                HttpStatus.OK);
    }

    @GetMapping("/articles/{articleId}/lots")
    public ResponseEntity<Response> getOpenLots(@PathVariable Long articleId) {
        if (!stockValuationFacade.isFifoEnabled()) {
            return new ResponseEntity<>(
                    ResponseUtil.successResponse(List.of()),
                    HttpStatus.OK);
        }
        List<ArticleStockLotDto> lots = articleStockLotRepository
                .findOpenLotsForArticleOrderByFifo(articleId, ArticleStockLotStatus.OPEN)
                .stream()
                .map(this::toDto)
                .toList();
        return new ResponseEntity<>(ResponseUtil.successResponse(lots), HttpStatus.OK);
    }

    private ArticleStockLotDto toDto(ArticleStockLot lot) {
        double remainingValue = lot.getQuantityRemaining() * lot.getUnitPurchasePrice();
        return ArticleStockLotDto.builder()
                .id(lot.getId())
                .articleId(lot.getArticle().getId())
                .quantityInitial(lot.getQuantityInitial())
                .quantityRemaining(lot.getQuantityRemaining())
                .unitPurchasePrice(lot.getUnitPurchasePrice())
                .entryDate(lot.getEntryDate())
                .sourceType(lot.getSourceType())
                .status(lot.getStatus())
                .remainingValue(remainingValue)
                .build();
    }
}
