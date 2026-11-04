package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
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
    private final FifoStockValuationService fifoStockValuationService;
    private final StockValuationFacade stockValuationFacade;

    public Map<String, Object> activate() {
        if (!stockValuationFacade.isFifoEnabled()) {
            throw new CustomValidationException(
                    "Le paramètre ENABLED_FIFO_STOCK_VALUATION doit être activé avant le backfill FIFO.");
        }

        List<Articles> articles = articlesRepository.findAll();
        int migratedArticles = 0;
        int trimmedArticles = 0;
        int skippedArticles = 0;
        List<String> blockingArticles = new ArrayList<>();

        for (Articles articleRef : articles) {
            Articles article = articlesRepository.findByIdForUpdate(articleRef.getId())
                    .orElse(articleRef);

            int stockQty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
            int openLotQty = remainingLotQuantity(article.getId());
            if (openLotQty == stockQty) {
                skippedArticles++;
                continue;
            }
            if (openLotQty > stockQty) {
                fifoStockValuationService.alignLotsToArticleStock(article);
                fifoStockValuationService.assertLotQuantityMatchesArticle(article);
                trimmedArticles++;
                continue;
            }

            Double unitPrice = fifoStockValuationService.resolveOpeningUnitPrice(article);
            if (unitPrice == null) {
                blockingArticles.add(formatArticleLabel(article) + " (prix d'achat manquant)");
                continue;
            }

            fifoStockValuationService.registerEntry(
                    article,
                    stockQty - openLotQty,
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
        result.put("trimmedArticles", trimmedArticles);
        result.put("skippedArticles", skippedArticles);
        result.put("message", "Lots FIFO alignés sur le stock magasin.");
        return result;
    }

    private int remainingLotQuantity(Long articleId) {
        Integer qty = lotRepository.sumRemainingQuantityByArticleId(articleId);
        return qty != null ? qty : 0;
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
