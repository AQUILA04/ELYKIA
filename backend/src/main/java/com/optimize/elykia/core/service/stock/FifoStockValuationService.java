package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.entity.stock.ArticleStockLotConsumption;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import com.optimize.elykia.core.repository.ArticleStockLotConsumptionRepository;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class FifoStockValuationService {

    private final ArticleStockLotRepository lotRepository;
    private final ArticleStockLotConsumptionRepository consumptionRepository;

    public ArticleStockLot registerEntry(
            Articles article,
            int quantity,
            double unitPurchasePrice,
            ArticleStockLotSourceType sourceType,
            StockReceptionItem receptionItem,
            LocalDate entryDate) {
        if (quantity <= 0) {
            throw new CustomValidationException("La quantité d'entrée doit être strictement positive.");
        }
        if (unitPurchasePrice <= 0) {
            throw new CustomValidationException("Le prix d'achat unitaire doit être strictement positif.");
        }

        ArticleStockLot lot = new ArticleStockLot();
        lot.setArticle(article);
        lot.setQuantityInitial(quantity);
        lot.setQuantityRemaining(quantity);
        lot.setUnitPurchasePrice(unitPurchasePrice);
        lot.setEntryDate(entryDate != null ? entryDate : LocalDate.now());
        lot.setSourceType(sourceType);
        lot.setStatus(ArticleStockLotStatus.OPEN);
        if (receptionItem != null) {
            lot.setStockReceptionItem(receptionItem);
        }

        return lotRepository.save(lot);
    }

    public void cancelEntry(StockReceptionItem receptionItem) {
        ArticleStockLot lot = lotRepository.findByStockReceptionItemId(receptionItem.getId())
                .orElse(null);

        if (lot != null) {
            if (lot.getQuantityRemaining() != lot.getQuantityInitial()) {
                throw new CustomValidationException(
                        "Impossible d'annuler cette réception car des articles (lot FIFO) ont déjà été consommés ou vendus.");
            }
            lotRepository.delete(lot);
        }
    }

    public FifoConsumptionResult consume(
            Articles article,
            int quantity,
            ArticleStockLotMovementType movementType,
            String sourceType,
            Long sourceId) {
        if (quantity <= 0) {
            throw new CustomValidationException("La quantité à consommer doit être strictement positive.");
        }

        List<ArticleStockLot> openLots = lotRepository.findOpenLotsForArticleOrderByFifo(
                article.getId(), ArticleStockLotStatus.OPEN);

        int remainingToConsume = quantity;
        double totalCost = 0.0;

        for (ArticleStockLot lot : openLots) {
            if (remainingToConsume <= 0) {
                break;
            }

            int available = lot.getQuantityRemaining();
            if (available <= 0) {
                continue;
            }

            int consumedFromLot = Math.min(available, remainingToConsume);
            double lineCost = consumedFromLot * lot.getUnitPurchasePrice();
            totalCost += lineCost;

            lot.setQuantityRemaining(available - consumedFromLot);
            if (lot.getQuantityRemaining() == 0) {
                lot.setStatus(ArticleStockLotStatus.DEPLETED);
            }
            lotRepository.save(lot);

            ArticleStockLotConsumption consumption = new ArticleStockLotConsumption();
            consumption.setLot(lot);
            consumption.setQuantity(consumedFromLot);
            consumption.setUnitPurchasePrice(lot.getUnitPurchasePrice());
            consumption.setMovementType(movementType);
            consumption.setSourceType(sourceType);
            consumption.setSourceId(sourceId);
            consumptionRepository.save(consumption);

            remainingToConsume -= consumedFromLot;
        }

        if (remainingToConsume > 0) {
            throw new CustomValidationException(
                    "Stock FIFO insuffisant pour l'article "
                            + article.getCommercialName()
                            + " (manque "
                            + remainingToConsume
                            + " unité(s)). Vérifiez la cohérence des lots ou activez le backfill FIFO.");
        }

        double averageUnitCost = quantity > 0 ? totalCost / quantity : 0.0;
        return FifoConsumptionResult.builder()
                .totalCost(totalCost)
                .averageUnitCost(averageUnitCost)
                .quantityConsumed(quantity)
                .build();
    }

    @Transactional(readOnly = true)
    public double getStockValuation(Long articleId) {
        Double value = lotRepository.sumRemainingValuationByArticleId(articleId);
        return value != null ? value : 0.0;
    }

    @Transactional(readOnly = true)
    public double getEstimatedMargin(Long articleId, double salePrice) {
        return lotRepository.findOpenLotsForArticleOrderByFifo(articleId, ArticleStockLotStatus.OPEN).stream()
                .mapToDouble(lot -> lot.getQuantityRemaining() * (salePrice - lot.getUnitPurchasePrice()))
                .sum();
    }

    @Transactional(readOnly = true)
    public int getRemainingLotQuantity(Long articleId) {
        Integer qty = lotRepository.sumRemainingQuantityByArticleId(articleId);
        return qty != null ? qty : 0;
    }

    public void assertLotQuantityMatchesArticle(Articles article) {
        int lotQty = getRemainingLotQuantity(article.getId());
        int articleQty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        if (lotQty != articleQty) {
            throw new CustomValidationException(
                    "Incohérence FIFO pour l'article "
                            + article.getCommercialName()
                            + " : stock article="
                            + articleQty
                            + ", lots="
                            + lotQty);
        }
    }
}
