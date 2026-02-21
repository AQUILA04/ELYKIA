package com.optimize.elykia.core.service;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.ArticleHistory;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.StockMovement;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.repository.StockMovementRepository;
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
        StockMovement movement = new StockMovement();
        movement.setArticle(article);
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setStockBefore(article.getStockQuantity());

        // Mise à jour du stock selon le type de mouvement
        int stockAfter = 0;
        if (type == MovementType.ENTRY || type == MovementType.RETURN || type == MovementType.INVENTORY_ADJUSTMENT) {
            stockAfter = article.getStockQuantity() + quantity;
        } else if (type == MovementType.RELEASE || type == MovementType.LOSS) {
            stockAfter = article.getStockQuantity() - quantity;
        }

        movement.setStockAfter(stockAfter);
        movement.setMovementDate(LocalDateTime.now());
        movement.setReason(reason);
        movement.setPerformedBy(performedBy);
        movement.setRelatedCredit(relatedCredit);
        movement.setUnitCost(article.getPurchasePrice());

        StockMovement saved = stockMovementRepository.save(movement);

        // Enregistrement dans l'historique de l'article
        ArticleHistory history = buildArticleHistory(article, type, quantity, performedBy);
        articleHistoryService.create(history);

        return saved;
    }

    /**
     * Construit l'entrée d'historique correspondant au type de mouvement.
     */
    private ArticleHistory buildArticleHistory(Articles article, MovementType type, Integer quantity,
            String performedBy) {
        return switch (type) {
            case ENTRY -> {
                com.optimize.elykia.core.dto.StockEntry stockEntry = new com.optimize.elykia.core.dto.StockEntry();
                stockEntry.setArticleId(article.getId());
                stockEntry.setQuantity(quantity);
                yield ArticleHistory.buildEntryHistory(article, stockEntry, performedBy);
            }
            case RETURN -> ArticleHistory.buildReturnHistory(article, quantity, performedBy);
            case RELEASE, LOSS -> ArticleHistory.buildReleaseHistory(article, quantity, performedBy);
            case ADJUSTMENT,
                    INVENTORY_ADJUSTMENT ->
                buildAdjustmentHistory(article, quantity, performedBy);
        };
    }

    /**
     * Construit un historique de type INVENTORY_ADJUSTMENT (ajustement/inventaire).
     */
    private ArticleHistory buildAdjustmentHistory(Articles article, Integer quantity, String performedBy) {
        ArticleHistory history = new ArticleHistory();
        history.setArticles(article);
        history.setInitialQuantity(article.getStockQuantity());
        history.setOperationQuantity(quantity);
        history.setFinalQuantity(article.getStockQuantity() + quantity);
        history.setOperationType(StockOperationType.INVENTORY_ADJUSTMENT);
        history.setOperationDate(java.time.LocalDate.now());
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
