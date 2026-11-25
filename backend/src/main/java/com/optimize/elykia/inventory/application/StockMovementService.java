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

/**
 * @deprecated Remplacé par {@link WarehouseStockService} et {@link com.optimize.elykia.inventory.domain.WarehouseStockLedgerEntry}.
 * @see WarehouseStockService
 */
@Deprecated(since = "2.16.0", forRemoval = true)
@Service
@Transactional
public class StockMovementService extends GenericService<StockMovement, Long> {

    private final StockMovementRepository stockMovementRepository;
    private final ArticleHistoryService articleHistoryService;
    private com.optimize.elykia.inventory.infrastructure.persistence.WarehouseStockLedgerEntryRepository warehouseLedgerRepository;
    private WarehouseStockService warehouseStockService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setWarehouseLedgerRepository(
            com.optimize.elykia.inventory.infrastructure.persistence.WarehouseStockLedgerEntryRepository warehouseLedgerRepository) {
        this.warehouseLedgerRepository = warehouseLedgerRepository;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setWarehouseStockService(WarehouseStockService warehouseStockService) {
        this.warehouseStockService = warehouseStockService;
    }

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

        if (warehouseLedgerRepository != null && warehouseStockService != null && article != null && article.getId() != null) {
            try {
                Long agencyId = warehouseStockService.resolveAgencyId(null);
                int before = stockBefore != null ? stockBefore : 0;
                int after = stockAfter != null ? stockAfter : before;
                com.optimize.elykia.inventory.domain.WarehouseStockLedgerEntry ledgerEntry =
                        new com.optimize.elykia.inventory.domain.WarehouseStockLedgerEntry();
                ledgerEntry.setAgencyId(agencyId);
                ledgerEntry.setArticleId(article.getId());
                ledgerEntry.setMovementType(type != null ? type.name() : "OTHER");
                ledgerEntry.setQuantityDelta(after - before);
                ledgerEntry.setOnHandBefore(Math.max(0, before));
                ledgerEntry.setOnHandAfter(Math.max(0, after));
                int reserved = article.getReservedQuantity() != null ? article.getReservedQuantity() : 0;
                ledgerEntry.setReservedBefore(Math.max(0, reserved));
                ledgerEntry.setReservedAfter(Math.max(0, reserved));
                ledgerEntry.setUnitCost(movement.getUnitCost());
                ledgerEntry.setTotalCost(movement.getUnitCost() != null && quantity != null
                        ? movement.getUnitCost() * Math.abs(quantity)
                        : null);
                if (historyContext != null) {
                    ledgerEntry.setReferenceType(historyContext.getReferenceType() != null
                            ? historyContext.getReferenceType().name()
                            : null);
                    ledgerEntry.setReferenceId(historyContext.getReferenceId());
                    ledgerEntry.setReferenceCode(historyContext.getReferenceLabel());
                    ledgerEntry.setBeneficiary(historyContext.getBeneficiary());
                } else if (relatedCreditId != null) {
                    ledgerEntry.setReferenceType("CREDIT");
                    ledgerEntry.setReferenceId(relatedCreditId);
                }
                ledgerEntry.setReason(reason);
                ledgerEntry.setPerformedBy(performedBy);
                ledgerEntry.setOperationDate(java.time.LocalDate.now());
                ledgerEntry.setOccurredAt(LocalDateTime.now());
                warehouseLedgerRepository.save(ledgerEntry);
            } catch (Exception ignored) {
                // Non bloquant
            }
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
