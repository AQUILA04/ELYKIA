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
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryReconciliationRepository;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.service.stock.StockMovementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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

    public InventoryReconciliationService(InventoryReconciliationRepository repository, InventoryItemRepository inventoryItemRepository, StockMovementRepository stockMovementRepository, ArticlesService articlesService, ArticleHistoryService articleHistoryService, StockMovementService stockMovementService, UserService userService) {
        super(repository);
        this.reconciliationRepository = repository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.articlesService = articlesService;
        this.articleHistoryService = articleHistoryService;
        this.stockMovementService = stockMovementService;
        this.userService = userService;
    }

    @Override
    public InventoryReconciliationRepository getRepository() {
        return reconciliationRepository;
    }

    @Transactional
    public InventoryItem reconcileDebt(ReconciliationDto dto) {
        InventoryItem item = inventoryItemRepository.findById(dto.getInventoryItemId())
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));

        if (item.getStatus() != InventoryItemStatus.DEBT) {
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
            // Ajuster le stock système au niveau physique
            Integer adjustment = item.getDifference(); // différence négative
            Integer newStock = article.getStockQuantity() + adjustment; // ajustement positif
            article.setStockQuantity(newStock);

            reconciliation.setReconciliationType(ReconciliationType.ERROR_CORRECTION);
            reconciliation.setAction(ReconciliationAction.ADJUST_TO_PHYSICAL);
            reconciliation.setStockAfter(newStock);

            // Enregistrer dans l'historique
            ArticleHistory history = new ArticleHistory();
            history.setArticles(article);
            history.setInitialQuantity(stockBefore);
            history.setOperationQuantity(Math.abs(adjustment));
            history.setFinalQuantity(newStock);
            history.setOperationType(StockOperationType.INVENTORY_ADJUSTMENT);
            history.setOperationDate(LocalDate.now());
            history.setOperationUser(username);
            articleHistoryService.create(history);

            // Enregistrer le mouvement de stock
            StockMovement movement = stockMovementService.recordMovement(
                    article,
                    MovementType.INVENTORY_ADJUSTMENT,
                    Math.abs(adjustment),
                    "Ajustement inventaire - Correction erreur: " + dto.getComment(),
                    username,
                    null
            );

            item.setStatus(InventoryItemStatus.RECONCILED);
            item.setReconciliationComment(dto.getComment());
            item.setReconciledBy(username);
            item.setReconciledAt(LocalDateTime.now());
            item.setDebtCancelled(true);

        } else if (dto.getAction() == ReconciliationAction.MARK_AS_DEBT) {
            reconciliation.setReconciliationType(ReconciliationType.DEBT_RESOLUTION);
            reconciliation.setAction(ReconciliationAction.MARK_AS_DEBT);
            reconciliation.setStockAfter(stockBefore);

            item.setStatus(InventoryItemStatus.RECONCILED);
            item.setReconciliationComment(dto.getComment());
            item.setReconciledBy(username);
            item.setReconciledAt(LocalDateTime.now());
            item.setMarkAsDebt(true);
            item.setDebtCancelled(false);

        } else if (dto.getAction() == ReconciliationAction.CANCEL_DEBT) {
            reconciliation.setReconciliationType(ReconciliationType.DEBT_RESOLUTION);
            reconciliation.setAction(ReconciliationAction.CANCEL_DEBT);
            reconciliation.setStockAfter(stockBefore);

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

        // Ajuster le stock système au niveau physique (surplus = quantité physique > quantité système)
        Integer adjustment = item.getDifference(); // différence positive
        Integer newStock = article.getStockQuantity() + adjustment;
        article.setStockQuantity(newStock);

        reconciliation.setStockAfter(newStock);

        // Enregistrer dans l'historique
        ArticleHistory history = new ArticleHistory();
        history.setArticles(article);
        history.setInitialQuantity(stockBefore);
        history.setOperationQuantity(adjustment);
        history.setFinalQuantity(newStock);
        history.setOperationType(StockOperationType.INVENTORY_ADJUSTMENT);
        history.setOperationDate(LocalDate.now());
        history.setOperationUser(username);
        articleHistoryService.create(history);

        // Enregistrer le mouvement de stock
        StockMovement movement = stockMovementService.recordMovement(
                article,
                MovementType.INVENTORY_ADJUSTMENT,
                adjustment,
                "Ajustement inventaire - Surplus: " + dto.getComment(),
                username,
                null
        );

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

    public List<InventoryReconciliation> getReconciliationHistory(Long inventoryItemId) {
        return reconciliationRepository.findByInventoryItemIdOrderByPerformedAtDesc(inventoryItemId);
    }

    public List<StockMovement> checkForInputErrors(Long inventoryItemId, LocalDate startDate, LocalDate endDate) {
        InventoryItem item = inventoryItemRepository.findById(inventoryItemId)
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));
        Long articleId = item.getArticle().getId();

        // Récupérer tous les mouvements de sortie (RELEASE) dans la période
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        return stockMovementRepository.findByTypeAndMovementDateBetween(
                MovementType.RELEASE,
                startDateTime,
                endDateTime
        ).stream()
                .filter(movement -> movement.getArticle().getId().equals(articleId))
                .toList();
    }
}

