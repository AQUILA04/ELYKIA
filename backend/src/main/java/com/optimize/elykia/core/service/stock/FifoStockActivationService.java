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

import java.time.LocalDate;
import java.util.ArrayList;
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
        int skippedArticles = 0;
        List<String> blockingArticles = new ArrayList<>();

        for (Articles articleRef : articles) {
            Articles article = articlesRepository.findByIdForUpdate(articleRef.getId())
                    .orElse(articleRef);

            int stockQty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
            if (stockQty <= 0) {
                continue;
            }

            int openLotQty = remainingLotQuantity(article.getId());
            if (openLotQty == stockQty) {
                skippedArticles++;
                continue;
            }
            if (openLotQty > 0) {
                blockingArticles.add(formatArticleLabel(article)
                        + " (stock=" + stockQty + ", lots ouverts=" + openLotQty + ")");
                continue;
            }

            Double unitPrice = resolveOpeningUnitPrice(article);
            if (unitPrice == null) {
                blockingArticles.add(formatArticleLabel(article) + " (prix d'achat manquant)");
                continue;
            }

            fifoStockValuationService.registerEntry(
                    article,
                    stockQty,
                    unitPrice,
                    ArticleStockLotSourceType.MIGRATION,
                    null,
                    LocalDate.now());
            fifoStockValuationService.assertLotQuantityMatchesArticle(article);
            migratedArticles++;
        }

        if (!blockingArticles.isEmpty()) {
            throw new CustomValidationException(
                    "Activation FIFO impossible : stock existant non calé sur les lots pour : "
                            + String.join(" ; ", blockingArticles));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("migratedArticles", migratedArticles);
        result.put("skippedArticles", skippedArticles);
        result.put("message", "Lots d'ouverture FIFO créés.");
        return result;
    }

    private int remainingLotQuantity(Long articleId) {
        Integer qty = lotRepository.sumRemainingQuantityByArticleId(articleId);
        return qty != null ? qty : 0;
    }

    private Double resolveOpeningUnitPrice(Articles article) {
        if (article.getPurchasePrice() > 0) {
            return article.getPurchasePrice();
        }
        List<StockReceptionItem> validatedItems =
                stockReceptionItemRepository
                        .findValidatedWithPositiveUnitPriceByArticleIdOrderByReceptionDateDesc(
                                article.getId());
        if (validatedItems.isEmpty()) {
            return null;
        }
        return validatedItems.get(0).getUnitPrice();
    }

    private static String formatArticleLabel(Articles article) {
        String name = article.getName();
        if (name == null || name.isBlank()) {
            name = article.getCommercialName();
        }
        if (name == null || name.isBlank()) {
            name = "Article";
        }
        return name + " #" + article.getId();
    }
}
