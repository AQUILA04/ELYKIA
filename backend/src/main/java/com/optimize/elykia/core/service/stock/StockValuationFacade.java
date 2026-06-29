package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional
public class StockValuationFacade {

    public static final String FIFO_FLAG_KEY = "ENABLED_FIFO_STOCK_VALUATION";

    private final ParameterService parameterService;
    private final FifoStockValuationService fifoStockValuationService;
    private final LegacyStockValuationAdapter legacyStockValuationAdapter;
    private final ArticleStockLotRepository lotRepository;

    @Transactional(readOnly = true)
    public boolean isFifoEnabled() {
        return parameterService.isEnabled(FIFO_FLAG_KEY);
    }

    public double resolveEntryUnitPrice(Articles article, Double requestedUnitPrice) {
        if (isFifoEnabled()) {
            if (requestedUnitPrice == null || requestedUnitPrice <= 0) {
                throw new CustomValidationException(
                        "Le prix d'achat unitaire est obligatoire pour une entrée de stock (mode FIFO).");
            }
            return requestedUnitPrice;
        }
        return legacyStockValuationAdapter.resolveEntryUnitPrice(article, requestedUnitPrice);
    }

    public ArticleStockLot registerEntry(
            Articles article,
            int quantity,
            double unitPurchasePrice,
            ArticleStockLotSourceType sourceType,
            StockReceptionItem receptionItem,
            LocalDate entryDate) {
        if (!isFifoEnabled()) {
            return legacyStockValuationAdapter.registerEntry(
                    article, quantity, unitPurchasePrice, sourceType, receptionItem, entryDate);
        }
        return fifoStockValuationService.registerEntry(
                article, quantity, unitPurchasePrice, sourceType, receptionItem, entryDate);
    }

    public FifoConsumptionResult consume(
            Articles article,
            int quantity,
            ArticleStockLotMovementType movementType,
            String sourceType,
            Long sourceId) {
        if (!isFifoEnabled()) {
            return legacyStockValuationAdapter.consume(article, quantity, movementType, sourceType, sourceId);
        }
        return fifoStockValuationService.consume(article, quantity, movementType, sourceType, sourceId);
    }

    @Transactional(readOnly = true)
    public double getStockValuation(Articles article) {
        if (!isFifoEnabled()) {
            return legacyStockValuationAdapter.getStockValuation(article);
        }
        return fifoStockValuationService.getStockValuation(article.getId());
    }

    @Transactional(readOnly = true)
    public double getTotalStockValuation() {
        if (!isFifoEnabled()) {
            return 0.0;
        }
        Double total = lotRepository.sumTotalRemainingValuation();
        return total != null ? total : 0.0;
    }

    @Transactional(readOnly = true)
    public double getCreditSaleValuationFromLots() {
        if (!isFifoEnabled()) {
            return 0.0;
        }
        Double total = lotRepository.sumCreditSaleValuationFromLots();
        return total != null ? total : 0.0;
    }

    @Transactional(readOnly = true)
    public double getSellingSaleValuationFromLots() {
        if (!isFifoEnabled()) {
            return 0.0;
        }
        Double total = lotRepository.sumSellingSaleValuationFromLots();
        return total != null ? total : 0.0;
    }

    @Transactional(readOnly = true)
    public double getEstimatedMargin(Articles article, double salePrice) {
        if (!isFifoEnabled()) {
            return legacyStockValuationAdapter.getEstimatedMargin(article, salePrice);
        }
        return fifoStockValuationService.getEstimatedMargin(article.getId(), salePrice);
    }
}
