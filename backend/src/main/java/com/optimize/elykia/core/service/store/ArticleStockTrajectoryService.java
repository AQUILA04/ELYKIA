package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.core.dto.ArticleStockTrajectoryDto;
import com.optimize.elykia.core.dto.InventoryCheckpointDto;
import com.optimize.elykia.core.dto.TimelineNodeDto;
import com.optimize.elykia.core.dto.TrajectorySummaryDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.inventory.InventoryReconciliation;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import com.optimize.elykia.core.enumaration.ReconciliationAction;
import com.optimize.elykia.core.enumaration.TimelineNodeKind;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import com.optimize.elykia.core.repository.InventoryItemRepository;
import com.optimize.elykia.core.repository.InventoryReconciliationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArticleStockTrajectoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final ArticleHistoryRepository articleHistoryRepository;
    private final InventoryReconciliationRepository reconciliationRepository;

    public ArticleStockTrajectoryDto getTrajectoryFromInventoryItem(Long inventoryItemId, LocalDate toDate) {
        InventoryItem source = inventoryItemRepository.findByIdWithInventoryAndArticle(inventoryItemId)
                .orElseThrow(() -> new ApplicationException("Article d'inventaire non trouvé"));
        return buildTrajectory(source, toDate);
    }

    public ArticleStockTrajectoryDto getTrajectoryFromArticle(Long articleId, Long fromInventoryId, LocalDate toDate) {
        InventoryItem source = inventoryItemRepository.findByInventoryIdAndArticleId(fromInventoryId, articleId)
                .orElseThrow(() -> new ApplicationException(
                        "Aucun item d'inventaire trouvé pour cet article dans l'inventaire demandé"));
        InventoryItem loaded = inventoryItemRepository.findByIdWithInventoryAndArticle(source.getId())
                .orElse(source);
        return buildTrajectory(loaded, toDate);
    }

    private ArticleStockTrajectoryDto buildTrajectory(InventoryItem source, LocalDate toDate) {
        Articles article = source.getArticle();
        Inventory inventory = source.getInventory();
        LocalDate effectiveTo = toDate != null ? toDate : LocalDate.now();
        LocalDateTime toInclusive = effectiveTo.equals(LocalDate.now())
                ? LocalDateTime.now()
                : effectiveTo.atTime(LocalTime.MAX);

        LocalDateTime anchorAt = resolveAnchorAt(inventory);
        ReconciliationAction sourceAction = resolveReconciliationAction(source);
        int baseline = resolveBaselineSystemQuantity(source, sourceAction);

        InventoryCheckpointDto fromCheckpoint = toCheckpointDto(source, baseline, sourceAction, anchorAt);

        List<ArticleHistory> movements = articleHistoryRepository
                .findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(article.getId(), anchorAt, toInclusive);

        List<InventoryItem> intermediateItems = inventoryItemRepository
                .findByArticleIdAndInventoryStatusIn(article.getId(),
                        List.of(InventoryStatus.COMPLETED, InventoryStatus.RECONCILED))
                .stream()
                .filter(ii -> !ii.getId().equals(source.getId()))
                .filter(ii -> {
                    LocalDateTime at = resolveAnchorAt(ii.getInventory());
                    return at.isAfter(anchorAt) && !at.isAfter(toInclusive);
                })
                .sorted(Comparator.comparing(ii -> resolveAnchorAt(ii.getInventory())))
                .toList();

        List<TimelineNodeDto> nodes = new ArrayList<>();
        int runningQty = baseline;
        int totalIn = 0;
        int totalOut = 0;

        record TimedEvent(LocalDateTime at, int order, Object payload) {
        }
        List<TimedEvent> events = new ArrayList<>();
        for (ArticleHistory h : movements) {
            LocalDateTime at = h.getOccurredAt() != null ? h.getOccurredAt() : h.getCreatedDate();
            events.add(new TimedEvent(at, 1, h));
        }
        for (InventoryItem ii : intermediateItems) {
            events.add(new TimedEvent(resolveAnchorAt(ii.getInventory()), 0, ii));
        }
        events.sort(Comparator
                .comparing(TimedEvent::at)
                .thenComparingInt(TimedEvent::order));

        for (TimedEvent event : events) {
            if (event.payload() instanceof ArticleHistory history) {
                int before = runningQty;
                int delta;
                int after;
                if (history.getInitialQuantity() != null && history.getInitialQuantity().equals(runningQty)
                        && history.getFinalQuantity() != null) {
                    after = history.getFinalQuantity();
                    delta = after - before;
                } else {
                    delta = history.signedDelta();
                    after = before + delta;
                }
                if (delta > 0) {
                    totalIn += delta;
                } else if (delta < 0) {
                    totalOut += Math.abs(delta);
                }
                runningQty = after;

                nodes.add(TimelineNodeDto.builder()
                        .kind(TimelineNodeKind.MOVEMENT)
                        .occurredAt(event.at())
                        .quantityBefore(before)
                        .quantityAfter(after)
                        .delta(delta)
                        .gapDetected(false)
                        .historyId(history.getId())
                        .operationType(history.getOperationType())
                        .operationUser(history.getOperationUser())
                        .referenceType(history.getReferenceType())
                        .referenceId(history.getReferenceId())
                        .reason(history.getReason())
                        .inventoryItemId(history.getInventoryItem() != null ? history.getInventoryItem().getId() : null)
                        .build());
            } else if (event.payload() instanceof InventoryItem checkpoint) {
                int systemQty = checkpoint.getSystemQuantity() != null ? checkpoint.getSystemQuantity() : 0;
                boolean gap = runningQty != systemQty;
                ReconciliationAction action = resolveReconciliationAction(checkpoint);

                nodes.add(TimelineNodeDto.builder()
                        .kind(TimelineNodeKind.INVENTORY_CHECKPOINT)
                        .occurredAt(event.at())
                        .quantityBefore(runningQty)
                        .quantityAfter(runningQty)
                        .delta(null)
                        .gapDetected(gap)
                        .inventoryId(checkpoint.getInventory().getId())
                        .inventoryItemId(checkpoint.getId())
                        .systemQuantity(checkpoint.getSystemQuantity())
                        .physicalQuantity(checkpoint.getPhysicalQuantity())
                        .difference(checkpoint.getDifference())
                        .itemStatus(checkpoint.getStatus())
                        .reconciliationAction(action)
                        .build());
            }
        }

        Integer currentSystem = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        int drift = runningQty - currentSystem;

        return ArticleStockTrajectoryDto.builder()
                .articleId(article.getId())
                .articleName(article.getName() != null ? article.getName() : article.getCommercialName())
                .articleMarque(article.getMarque())
                .articleModel(article.getModel())
                .from(fromCheckpoint)
                .toDate(effectiveTo)
                .reconstructedQuantity(runningQty)
                .currentSystemQuantity(currentSystem)
                .drift(drift)
                .summary(TrajectorySummaryDto.builder()
                        .totalIn(totalIn)
                        .totalOut(totalOut)
                        .netDelta(totalIn - totalOut)
                        .movementCount(movements.size())
                        .intermediateInventoryCount(intermediateItems.size())
                        .build())
                .nodes(nodes)
                .build();
    }

    static int resolveBaselineSystemQuantity(InventoryItem item, ReconciliationAction action) {
        InventoryItemStatus status = item.getStatus();
        if (status == InventoryItemStatus.VALIDATED) {
            return item.getPhysicalQuantity() != null ? item.getPhysicalQuantity() : nz(item.getSystemQuantity());
        }
        if (status == InventoryItemStatus.RECONCILED) {
            if (action == ReconciliationAction.ADJUST_TO_PHYSICAL
                    || action == ReconciliationAction.MARK_AS_SURPLUS) {
                return item.getPhysicalQuantity() != null ? item.getPhysicalQuantity() : nz(item.getSystemQuantity());
            }
            return nz(item.getSystemQuantity());
        }
        return nz(item.getSystemQuantity());
    }

    private ReconciliationAction resolveReconciliationAction(InventoryItem item) {
        List<InventoryReconciliation> reconciliations = reconciliationRepository
                .findByInventoryItemIdOrderByPerformedAtDesc(item.getId());
        if (!reconciliations.isEmpty()) {
            return reconciliations.get(0).getAction();
        }
        return inferActionFromFlags(item);
    }

    static ReconciliationAction inferActionFromFlags(InventoryItem item) {
        if (Boolean.TRUE.equals(item.getMarkAsDebt())) {
            return ReconciliationAction.MARK_AS_DEBT;
        }
        if (item.getStatus() == InventoryItemStatus.RECONCILED && item.getDifference() != null
                && item.getDifference() > 0) {
            return ReconciliationAction.MARK_AS_SURPLUS;
        }
        if (item.getStatus() == InventoryItemStatus.RECONCILED && item.getDifference() != null
                && item.getDifference() < 0 && Boolean.TRUE.equals(item.getDebtCancelled())
                && !Boolean.TRUE.equals(item.getMarkAsDebt())) {
            return ReconciliationAction.ADJUST_TO_PHYSICAL;
        }
        if (item.getStatus() == InventoryItemStatus.RECONCILED && Boolean.TRUE.equals(item.getDebtCancelled())) {
            return ReconciliationAction.CANCEL_DEBT;
        }
        return null;
    }

    static LocalDateTime resolveAnchorAt(Inventory inventory) {
        if (inventory.getCompletedAt() != null) {
            return inventory.getCompletedAt();
        }
        return inventory.getInventoryDate().atTime(LocalTime.MAX);
    }

    private InventoryCheckpointDto toCheckpointDto(InventoryItem item, int baseline,
            ReconciliationAction action, LocalDateTime anchorAt) {
        Inventory inv = item.getInventory();
        return InventoryCheckpointDto.builder()
                .inventoryId(inv.getId())
                .inventoryItemId(item.getId())
                .inventoryDate(inv.getInventoryDate())
                .completedAt(inv.getCompletedAt())
                .anchorAt(anchorAt)
                .inventoryStatus(inv.getStatus())
                .systemQuantity(item.getSystemQuantity())
                .physicalQuantity(item.getPhysicalQuantity())
                .difference(item.getDifference())
                .itemStatus(item.getStatus())
                .baselineSystemQuantity(baseline)
                .reconciliationAction(action)
                .markAsDebt(item.getMarkAsDebt())
                .debtCancelled(item.getDebtCancelled())
                .build();
    }

    private static int nz(Integer value) {
        return value != null ? value : 0;
    }
}
