package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class StockMovementService extends GenericService<StockMovement, Long> {

    private final StockMovementRepository stockMovementRepository;
    private final ArticleHistoryService articleHistoryService;

    public StockMovementService(StockMovementRepository repository,
            StockMovementRepository stockMovementRepository,
            ArticleHistoryService articleHistoryService) {
        super(repository);
        this.stockMovementRepository = stockMovementRepository;
        this.articleHistoryService = articleHistoryService;
    }

    public StockMovement recordMovement(Articles article, MovementType type, Integer quantity,
            String reason, String performedBy, Credit relatedCredit) {
        return recordMovement(article, type, quantity, reason, performedBy, relatedCredit, null);
    }

    public StockMovement recordMovement(Articles article, MovementType type, Integer quantity,
            String reason, String performedBy, Credit relatedCredit, Double unitCost) {
        int stockBefore = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        int stockAfter;
        if (type == MovementType.ENTRY || type == MovementType.RETURN || type == MovementType.INVENTORY_ADJUSTMENT) {
            stockAfter = stockBefore + quantity;
        } else if (type == MovementType.RELEASE || type == MovementType.LOSS) {
            stockAfter = stockBefore - quantity;
        } else {
            stockAfter = stockBefore;
        }
        return recordMovementWithSnapshot(article, type, quantity, stockBefore, stockAfter,
                reason, performedBy, relatedCredit, unitCost, true);
    }

    /**
     * Enregistre un mouvement avec stock avant/après explicites.
     * Utile quand le stock article a déjà été muté (ex. réconciliation inventaire).
     *
     * @param writeArticleHistory si false, n'écrit pas ArticleHistory (appelant gère le ledger)
     */
    public StockMovement recordMovementWithSnapshot(Articles article, MovementType type, Integer quantity,
            Integer stockBefore, Integer stockAfter, String reason, String performedBy,
            Credit relatedCredit, Double unitCost, boolean writeArticleHistory) {
        StockMovement movement = new StockMovement();
        movement.setArticle(article);
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setStockBefore(stockBefore);
        movement.setStockAfter(stockAfter);
        movement.setMovementDate(LocalDateTime.now());
        movement.setReason(reason);
        movement.setPerformedBy(performedBy);
        movement.setRelatedCredit(relatedCredit);
        movement.setUnitCost(unitCost != null ? unitCost : article.getPurchasePrice());

        StockMovement saved = stockMovementRepository.save(movement);

        if (writeArticleHistory) {
            ArticleHistory history = buildArticleHistory(article, type, quantity, performedBy,
                    stockBefore, stockAfter);
            articleHistoryService.create(history);
        }

        return saved;
    }

    private ArticleHistory buildArticleHistory(Articles article, MovementType type, Integer quantity,
            String performedBy, Integer stockBefore, Integer stockAfter) {
        return switch (type) {
            case ENTRY -> {
                com.optimize.elykia.core.dto.StockEntry stockEntry = new com.optimize.elykia.core.dto.StockEntry();
                stockEntry.setArticleId(article.getId());
                stockEntry.setQuantity(quantity);
                ArticleHistory h = ArticleHistory.buildEntryHistory(article, stockEntry, performedBy);
                h.setInitialQuantity(stockBefore);
                h.setFinalQuantity(stockAfter);
                yield h;
            }
            case RETURN -> {
                ArticleHistory h = ArticleHistory.buildReturnHistory(article, quantity, performedBy);
                h.setInitialQuantity(stockBefore);
                h.setFinalQuantity(stockAfter);
                yield h;
            }
            case RELEASE, LOSS -> {
                ArticleHistory h = ArticleHistory.buildReleaseHistory(article, quantity, performedBy);
                h.setInitialQuantity(stockBefore);
                h.setFinalQuantity(stockAfter);
                yield h;
            }
            case ADJUSTMENT, INVENTORY_ADJUSTMENT ->
                buildAdjustmentHistory(article, quantity, performedBy, stockBefore, stockAfter);
        };
    }

    private ArticleHistory buildAdjustmentHistory(Articles article, Integer quantity, String performedBy,
            Integer stockBefore, Integer stockAfter) {
        ArticleHistory history = new ArticleHistory();
        history.setArticles(article);
        history.setInitialQuantity(stockBefore);
        history.setOperationQuantity(quantity);
        history.setFinalQuantity(stockAfter);
        history.setOperationType(StockOperationType.INVENTORY_ADJUSTMENT);
        history.setOperationDate(java.time.LocalDate.now());
        history.setOccurredAt(LocalDateTime.now());
        history.setOperationUser(performedBy);
        return history;
    }

    public List<StockMovement> getMovementsByArticle(Long articleId) {
        return stockMovementRepository.findByArticleIdOrderByMovementDateDesc(articleId);
    }

    public List<StockMovement> getMovementsByCredit(Long creditId) {
        return stockMovementRepository.findByRelatedCreditId(creditId);
    }

    public Integer getTotalSalesForArticle(Long articleId, LocalDateTime startDate, LocalDateTime endDate) {
        Integer sales = stockMovementRepository.sumQuantityByArticleAndTypeAndDateRange(
                articleId, MovementType.RELEASE, startDate, endDate);
        return sales != null ? sales : 0;
    }
}
