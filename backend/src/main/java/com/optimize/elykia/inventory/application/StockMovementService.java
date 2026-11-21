package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.inventory.web.dto.ArticleHistoryContext;
import com.optimize.elykia.inventory.domain.ArticleHistory;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.domain.StockMovement;
import com.optimize.elykia.inventory.domain.MovementType;
import com.optimize.elykia.inventory.domain.StockOperationType;
import com.optimize.elykia.inventory.infrastructure.persistence.StockMovementRepository;
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
            String reason, String performedBy, Long relatedCreditId) {
        return recordMovement(article, type, quantity, reason, performedBy, relatedCreditId, null, null);
    }

    public StockMovement recordMovement(Articles article, MovementType type, Integer quantity,
            String reason, String performedBy, Long relatedCreditId, Double unitCost) {
        return recordMovement(article, type, quantity, reason, performedBy, relatedCreditId, unitCost, null);
    }

    public StockMovement recordMovement(Articles article, MovementType type, Integer quantity,
            String reason, String performedBy, Long relatedCreditId, Double unitCost,
            ArticleHistoryContext historyContext) {
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
                reason, performedBy, relatedCreditId, unitCost, true, historyContext);
    }

    public StockMovement recordMovementWithSnapshot(Articles article, MovementType type, Integer quantity,
            Integer stockBefore, Integer stockAfter, String reason, String performedBy,
            Long relatedCreditId, Double unitCost, boolean writeArticleHistory) {
        return recordMovementWithSnapshot(article, type, quantity, stockBefore, stockAfter,
                reason, performedBy, relatedCreditId, unitCost, writeArticleHistory, null);
    }

    /**
     * Enregistre un mouvement avec stock avant/après explicites.
     * Utile quand le stock article a déjà été muté (ex. réconciliation inventaire).
     *
     * @param writeArticleHistory si false, n'écrit pas ArticleHistory (appelant gère le ledger)
     */
    public StockMovement recordMovementWithSnapshot(Articles article, MovementType type, Integer quantity,
            Integer stockBefore, Integer stockAfter, String reason, String performedBy,
            Long relatedCreditId, Double unitCost, boolean writeArticleHistory,
            ArticleHistoryContext historyContext) {
        StockMovement movement = new StockMovement();
        movement.setArticle(article);
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setStockBefore(stockBefore);
        movement.setStockAfter(stockAfter);
        movement.setMovementDate(LocalDateTime.now());
        movement.setReason(reason);
        movement.setPerformedBy(performedBy);
        movement.setRelatedCreditId(relatedCreditId);
        movement.setUnitCost(unitCost != null ? unitCost : article.getPurchasePrice());

        StockMovement saved = stockMovementRepository.save(movement);

        if (writeArticleHistory) {
            ArticleHistory history = buildArticleHistory(article, type, quantity, performedBy,
                    stockBefore, stockAfter, historyContext);
            articleHistoryService.create(history);
        }

        return saved;
    }

    private ArticleHistory buildArticleHistory(Articles article, MovementType type, Integer quantity,
            String performedBy, Integer stockBefore, Integer stockAfter,
            ArticleHistoryContext historyContext) {
        ArticleHistory history = switch (type) {
            case ENTRY -> {
                com.optimize.elykia.inventory.web.dto.StockEntry stockEntry = new com.optimize.elykia.inventory.web.dto.StockEntry();
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
        applyHistoryContext(history, historyContext, performedBy);
        return history;
    }

    static void applyHistoryContext(ArticleHistory history, ArticleHistoryContext context, String performedBy) {
        if (context == null) {
            if (history.getBeneficiary() == null) {
                history.setBeneficiary(performedBy);
            }
            return;
        }
        if (context.getBeneficiary() != null) {
            history.setBeneficiary(context.getBeneficiary());
        } else if (history.getBeneficiary() == null) {
            history.setBeneficiary(performedBy);
        }
        history.setReferenceType(context.getReferenceType());
        history.setReferenceId(context.getReferenceId());
        history.setReferenceLabel(context.getReferenceLabel());
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
