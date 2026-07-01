package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FifoStockActivationService {

    private final ArticlesRepository articlesRepository;
    private final ArticleStockLotRepository lotRepository;
    private final StockReceptionItemRepository stockReceptionItemRepository;
    private final FifoStockValuationService fifoStockValuationService;
    private final StockValuationFacade stockValuationFacade;

    public Map<String, Object> activate() {
        if (!stockValuationFacade.isFifoEnabled()) {
            throw new CustomValidationException(
                    "Le paramètre ENABLED_FIFO_STOCK_VALUATION doit être activé avant le backfill FIFO.");
        }

        List<Articles> articles = articlesRepository.findAll();
        int migratedArticles = 0;
        int receptionArticles = 0;
        int skippedArticles = 0;
        int inconsistentArticles = 0;

        for (Articles article : articles) {
            int stockQty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
            if (stockQty <= 0) {
                continue;
            }

            if (lotRepository.existsByArticleId(article.getId())) {
                skippedArticles++;
                try {
                    fifoStockValuationService.assertLotQuantityMatchesArticle(article);
                } catch (CustomValidationException ex) {
                    inconsistentArticles++;
                    log.warn("FIFO incohérent article {}: {}", article.getId(), ex.getMessage());
                }
                continue;
            }

            if (tryBackfillFromReceptions(article)) {
                receptionArticles++;
            } else {
                fifoStockValuationService.registerEntry(
                        article,
                        stockQty,
                        article.getPurchasePrice(),
                        ArticleStockLotSourceType.MIGRATION,
                        null,
                        null);
                migratedArticles++;
            }

            fifoStockValuationService.assertLotQuantityMatchesArticle(article);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("migratedArticles", migratedArticles);
        result.put("receptionArticles", receptionArticles);
        result.put("skippedArticles", skippedArticles);
        result.put("inconsistentArticles", inconsistentArticles);
        result.put("message", "Backfill FIFO terminé.");
        return result;
    }

    private boolean tryBackfillFromReceptions(Articles article) {
        List<StockReceptionItem> receptions =
                stockReceptionItemRepository.findByArticleIdOrderByReceptionDateAsc(article.getId());
        if (receptions.isEmpty()) {
            return false;
        }

        int stockQty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        int receptionQty = receptions.stream()
                .mapToInt(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                .sum();

        if (receptionQty != stockQty) {
            return false;
        }

        for (StockReceptionItem receptionItem : receptions) {
            double unitPrice = receptionItem.getUnitPrice() != null && receptionItem.getUnitPrice() > 0
                    ? receptionItem.getUnitPrice()
                    : article.getPurchasePrice();
            fifoStockValuationService.registerEntry(
                    article,
                    receptionItem.getQuantity(),
                    unitPrice,
                    ArticleStockLotSourceType.STOCK_RECEPTION,
                    receptionItem,
                    receptionItem.getStockReception() != null
                            ? receptionItem.getStockReception().getReceptionDate()
                            : null);
        }
        return true;
    }
}
