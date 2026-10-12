package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ReconciliationDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.inventory.InventoryReconciliation;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.ReconciliationAction;
import com.optimize.elykia.core.enumaration.ReconciliationType;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryReconciliationRepository;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.service.debt.DebtService;
import com.optimize.elykia.core.service.stock.StockMovementService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class InventoryReconciliationService extends GenericService<InventoryReconciliation, Long> {

    private final InventoryReconciliationRepository reconciliationRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ArticlesService articlesService;
    private final ArticleHistoryService articleHistoryService;
    private final StockMovementService stockMovementService;
    private final UserService userService;
    private final DebtService debtService;

    public InventoryReconciliationService(InventoryReconciliationRepository repository,
            InventoryItemRepository inventoryItemRepository, StockMovementRepository stockMovementRepository,
            ArticlesService articlesService, ArticleHistoryService articleHistoryService,
            StockMovementService stockMovementService, UserService userService,
            @Lazy DebtService debtService) {
        super(repository);
        this.reconciliationRepository = repository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.articlesService = articlesService;
        this.articleHistoryService = articleHistoryService;
        this.stockMovementService = stockMovementService;
        this.userService = userService;
        this.debtService = debtService;
    }

    @Override
    public InventoryReconciliationRepository getRepository() {
        return reconciliationRepository;
    }

    @Transactional
    public InventoryItem reconcileDebt(ReconciliationDto dto) {
        InventoryItem item = inventoryItemRepository.findById(dto.getInventoryItemId())
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));

        boolean cancellingExistingDebt = dto.getAction() == ReconciliationAction.CANCEL_DEBT
                && Boolean.TRUE.equals(item.getMarkAsDebt())
                && item.getStatus() == InventoryItemStatus.RECONCILED;
        if (item.getStatus() != InventoryItemStatus.DEBT && !cancellingExistingDebt) {
            throw new ApplicationException("Cet article n'a pas de dette à réconcilier.");
        }

        String username = userService.getCurrentUser().getUsername();
        Articles article = item.getArticle();
        Integer stockBefore = article.getStockQuantity();

        InventoryReconciliation reconciliation = new InventoryReconciliation();
        reconciliation.setInventoryItem(item);
        reconciliation.setPerformedBy(username);
        reconciliation.setPerformedAt(LocalDateTime.now());
        reconciliation.setStockBefore(stockBefore);
        reconciliation.setComment(dto.getComment());

        if (dto.getAction() == ReconciliationAction.ADJUST_TO_PHYSICAL) {
            Integer adjustment = item.getDifference();
            Integer newStock = Math.max(0, article.getStockQuantity() + adjustment);
            article.setStockQuantity(newStock);

            reconciliation.setReconciliationType(ReconciliationType.ERROR_CORRECTION);
            reconciliation.setAction(ReconciliationAction.ADJUST_TO_PHYSICAL);
            reconciliation.setStockAfter(newStock);

            String reason = "Ajustement inventaire - Correction erreur: " + dto.getComment();
            recordInventoryAdjustmentLedger(item, article, stockBefore, newStock, Math.abs(adjustment),
                    username, reason);

            item.setStatus(InventoryItemStatus.RECONCILED);
            item.setReconciliationComment(dto.getComment());
            item.setReconciledBy(username);
            item.setReconciledAt(LocalDateTime.now());
            item.setDebtCancelled(true);

        } else if (dto.getAction() == ReconciliationAction.MARK_AS_DEBT) {
            // Aligne le stock système sur le physique et enregistre la dette financière
            Integer adjustment = item.getDifference();
            Integer newStock = Math.max(0, article.getStockQuantity() + adjustment);
            article.setStockQuantity(newStock);

            reconciliation.setReconciliationType(ReconciliationType.DEBT_RESOLUTION);
            reconciliation.setAction(ReconciliationAction.MARK_AS_DEBT);
            reconciliation.setStockAfter(newStock);

            String reason = "Dette magasinier - Ajustement inventaire: " + dto.getComment();
            recordInventoryAdjustmentLedger(item, article, stockBefore, newStock, Math.abs(adjustment),
                    username, reason);

            item.setStatus(InventoryItemStatus.RECONCILED);
            item.setReconciliationComment(dto.getComment());
            item.setReconciledBy(username);
            item.setReconciledAt(LocalDateTime.now());
            item.setMarkAsDebt(true);
            item.setDebtCancelled(false);

        } else if (dto.getAction() == ReconciliationAction.CANCEL_DEBT) {
            // Restaure le stock système si une dette avait baissé le stock
            if (Boolean.TRUE.equals(item.getMarkAsDebt()) && item.getDifference() != null && item.getDifference() < 0) {
                Integer restoreQty = Math.abs(item.getDifference());
                Integer newStock = article.getStockQuantity() + restoreQty;
                article.setStockQuantity(newStock);
                reconciliation.setStockAfter(newStock);
                String reason = "Annulation dette magasinier: " + dto.getComment();
                recordInventoryAdjustmentLedger(item, article, stockBefore, newStock, restoreQty,
                        username, reason);
                if (item.getInventory() != null) {
                    debtService.cancelInventoryDebt(item.getInventory().getId());
                }
            } else {
                reconciliation.setStockAfter(stockBefore);
            }

            reconciliation.setReconciliationType(ReconciliationType.DEBT_RESOLUTION);
            reconciliation.setAction(ReconciliationAction.CANCEL_DEBT);

            item.setStatus(InventoryItemStatus.RECONCILED);
            item.setReconciliationComment(dto.getComment());
            item.setReconciledBy(username);
            item.setReconciledAt(LocalDateTime.now());
            item.setMarkAsDebt(false);
            item.setDebtCancelled(true);
        }

        item.addReconciliation(reconciliation);
        create(reconciliation);
        articlesService.update(article);
        inventoryItemRepository.save(item);

        if (dto.getAction() == ReconciliationAction.MARK_AS_DEBT
                && dto.getStorekeeperUsername() != null
                && !dto.getStorekeeperUsername().isBlank()) {
            registerInventoryDebt(item.getInventory(), dto.getStorekeeperUsername(), List.of(item), dto.getComment());
        }

        return item;
    }

    @Transactional
    public InventoryItem reconcileSurplus(ReconciliationDto dto) {
        InventoryItem item = inventoryItemRepository.findById(dto.getInventoryItemId())
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));

        if (item.getStatus() != InventoryItemStatus.SURPLUS) {
            throw new ApplicationException("Cet article n'a pas de surplus à réconcilier.");
        }

        String username = userService.getCurrentUser().getUsername();
        Articles article = item.getArticle();
        Integer stockBefore = article.getStockQuantity();

        InventoryReconciliation reconciliation = new InventoryReconciliation();
        reconciliation.setInventoryItem(item);
        reconciliation.setPerformedBy(username);
        reconciliation.setPerformedAt(LocalDateTime.now());
        reconciliation.setStockBefore(stockBefore);
        reconciliation.setComment(dto.getComment());
        reconciliation.setReconciliationType(ReconciliationType.SURPLUS_RESOLUTION);
        reconciliation.setAction(ReconciliationAction.MARK_AS_SURPLUS);

        Integer adjustment = item.getDifference();
        Integer newStock = Math.max(0, article.getStockQuantity() + adjustment);
        article.setStockQuantity(newStock);

        reconciliation.setStockAfter(newStock);

        String reason = "Ajustement inventaire - Surplus: " + dto.getComment();
        recordInventoryAdjustmentLedger(item, article, stockBefore, newStock, adjustment, username, reason);

        item.setStatus(InventoryItemStatus.RECONCILED);
        item.setReconciliationComment(dto.getComment());
        item.setReconciledBy(username);
        item.setReconciledAt(LocalDateTime.now());

        item.addReconciliation(reconciliation);
        create(reconciliation);
        articlesService.update(article);
        inventoryItemRepository.save(item);

        return item;
    }

    /**
     * Une seule écriture ArticleHistory (liée à l'item) + StockMovement sans double historique.
     */
    private void recordInventoryAdjustmentLedger(InventoryItem item, Articles article,
            Integer stockBefore, Integer stockAfter, Integer operationQuantity,
            String username, String reason) {
        LocalDateTime now = LocalDateTime.now();
        ArticleHistory history = new ArticleHistory();
        history.setArticles(article);
        history.setInitialQuantity(stockBefore);
        history.setOperationQuantity(operationQuantity);
        history.setFinalQuantity(stockAfter);
        history.setOperationType(StockOperationType.INVENTORY_ADJUSTMENT);
        history.setOperationDate(now.toLocalDate());
        history.setOccurredAt(now);
        history.setOperationUser(username);
        history.setInventoryItem(item);
        history.setReferenceType(StockHistoryReferenceType.INVENTORY);
        history.setReferenceId(item.getInventory() != null ? item.getInventory().getId() : null);
        if (item.getInventory() != null) {
            history.setReferenceLabel("Inventaire #" + item.getInventory().getId());
        }
        history.setBeneficiary(username);
        history.setReason(reason);
        articleHistoryService.create(history);

        stockMovementService.recordMovementWithSnapshot(
                article,
                MovementType.INVENTORY_ADJUSTMENT,
                operationQuantity,
                stockBefore,
                stockAfter,
                reason,
                username,
                null,
                null,
                false);
    }

    @Transactional
    public InventoryItem adjustStockToPhysical(Long inventoryItemId, String comment) {
        ReconciliationDto dto = new ReconciliationDto();
        dto.setInventoryItemId(inventoryItemId);
        dto.setComment(comment);
        dto.setAction(ReconciliationAction.ADJUST_TO_PHYSICAL);

        InventoryItem item = inventoryItemRepository.findById(inventoryItemId)
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));
        if (item.getStatus() == InventoryItemStatus.DEBT) {
            return reconcileDebt(dto);
        } else if (item.getStatus() == InventoryItemStatus.SURPLUS) {
            return reconcileSurplus(dto);
        } else {
            throw new ApplicationException("Cet article n'a pas d'écart à ajuster.");
        }
    }

    @Transactional
    public List<com.optimize.elykia.core.dto.BulkReconciliationResultDto.ReconciliationItemResult> bulkReconcile(
            com.optimize.elykia.core.dto.BulkReconciliationDto bulkDto) {
        List<com.optimize.elykia.core.dto.BulkReconciliationResultDto.ReconciliationItemResult> results = new ArrayList<>();
        List<InventoryItem> debtItems = new ArrayList<>();
        com.optimize.elykia.core.entity.inventory.Inventory inventory = null;

        for (Long itemId : bulkDto.getInventoryItemIds()) {
            com.optimize.elykia.core.dto.BulkReconciliationResultDto.ReconciliationItemResult result =
                    new com.optimize.elykia.core.dto.BulkReconciliationResultDto.ReconciliationItemResult();
            result.setInventoryItemId(itemId);

            try {
                ReconciliationDto dto = new ReconciliationDto();
                dto.setInventoryItemId(itemId);
                dto.setAction(bulkDto.getAction());
                dto.setComment(bulkDto.getComment());
                dto.setMarkAsDebt(bulkDto.getMarkAsDebt());
                dto.setCancelDebt(bulkDto.getCancelDebt());
                // Dette créée une seule fois en fin de lot (évite doublons)
                dto.setStorekeeperUsername(null);

                InventoryItem item;
                if (bulkDto.getAction() == ReconciliationAction.MARK_AS_SURPLUS) {
                    item = reconcileSurplus(dto);
                } else {
                    item = reconcileDebt(dto);
                }

                if (bulkDto.getAction() == ReconciliationAction.MARK_AS_DEBT
                        && Boolean.TRUE.equals(item.getMarkAsDebt())) {
                    debtItems.add(item);
                    inventory = item.getInventory();
                }

                result.setSuccess(true);
                result.setMessage("Succès");

                com.optimize.elykia.core.dto.InventoryItemDto itemDto = new com.optimize.elykia.core.dto.InventoryItemDto();
                itemDto.setId(item.getId());
                itemDto.setSystemQuantity(item.getSystemQuantity());
                itemDto.setPhysicalQuantity(item.getPhysicalQuantity());
                itemDto.setDifference(item.getDifference());
                itemDto.setStatus(item.getStatus());
                itemDto.setReconciliationComment(item.getReconciliationComment());
                itemDto.setMarkAsDebt(item.getMarkAsDebt());
                itemDto.setDebtCancelled(item.getDebtCancelled());
                if (item.getArticle() != null) {
                    itemDto.setArticleId(item.getArticle().getId());
                    itemDto.setArticleName(item.getArticle().getCommercialName());
                    itemDto.setArticleMarque(item.getArticle().getMarque());
                    itemDto.setArticleModel(item.getArticle().getModel());
                    itemDto.setArticleType(item.getArticle().getType());
                }
                result.setItem(itemDto);

            } catch (Exception e) {
                result.setSuccess(false);
                result.setMessage(e.getMessage());
            }
            results.add(result);
        }

        if (inventory != null && !debtItems.isEmpty()) {
            String storekeeper = bulkDto.getStorekeeperUsername();
            if (storekeeper == null || storekeeper.isBlank()) {
                storekeeper = inventory.getCreatedByUser();
            }
            if (storekeeper == null || storekeeper.isBlank()) {
                throw new ApplicationException("Magasinier responsable obligatoire pour créer la dette.");
            }
            registerInventoryDebt(inventory, storekeeper, debtItems, bulkDto.getComment());
        }

        return results;
    }

    private void registerInventoryDebt(
            com.optimize.elykia.core.entity.inventory.Inventory inventory,
            String storekeeperUsername,
            List<InventoryItem> items,
            String comment) {
        Map<Long, Double> prices = new HashMap<>();
        for (InventoryItem item : items) {
            Articles article = item.getArticle();
            if (article == null) {
                continue;
            }
            Double purchase = article.getPurchasePrice();
            if (purchase == null || purchase <= 0D) {
                throw new ApplicationException(
                        "Prix d'achat manquant pour l'article " + article.getCommercialName());
            }
            prices.put(article.getId(), purchase);
        }
        debtService.createInventoryDebt(inventory, storekeeperUsername, items, prices);
    }

    public List<InventoryReconciliation> getReconciliationHistory(Long inventoryItemId) {
        return reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(inventoryItemId);
    }

    public List<StockMovement> checkForInputErrors(Long inventoryItemId, LocalDate startDate, LocalDate endDate) {
        InventoryItem item = inventoryItemRepository.findById(inventoryItemId)
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));
        Long articleId = item.getArticle().getId();

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        return stockMovementRepository.findByTypeAndMovementDateBetween(
                MovementType.RELEASE,
                startDateTime,
                endDateTime).stream()
                .filter(movement -> movement.getArticle().getId().equals(articleId))
                .toList();
    }
}
