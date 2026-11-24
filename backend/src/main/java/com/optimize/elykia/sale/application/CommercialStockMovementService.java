package com.optimize.elykia.sale.application;

import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
import com.optimize.elykia.commercialstock.api.LegacyStockMovementEvent;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.CommercialStockMovement;
import com.optimize.elykia.sale.domain.CommercialStockMovementType;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialStockMovementRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class CommercialStockMovementService {

    private final CommercialStockMovementRepository repository;
    private final CommercialMonthlyStockItemRepository stockItemRepository;
    private ApplicationEventPublisher eventPublisher;

    @Autowired(required = false)
    public void setEventPublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public CommercialStockMovementService(
            CommercialStockMovementRepository repository,
            CommercialMonthlyStockItemRepository stockItemRepository) {
        this.repository = repository;
        this.stockItemRepository = stockItemRepository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public CommercialStockMovement record(
            Long stockItemId,
            Long creditId,
            String creditReference,
            CommercialStockMovementType movementType,
            Integer quantityBefore,
            Integer quantityMoved,
            Integer quantityAfter,
            Long stockReturnId,
            String collector,
            Long articleId,
            String articleName) {
        return record(
                stockItemId, creditId, creditReference, movementType, quantityBefore, quantityMoved, quantityAfter,
                stockReturnId, collector, articleId, articleName, null, null, null, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public CommercialStockMovement record(
            Long stockItemId,
            Long creditId,
            String creditReference,
            CommercialStockMovementType movementType,
            Integer quantityBefore,
            Integer quantityMoved,
            Integer quantityAfter,
            Long stockReturnId,
            String collector,
            Long articleId,
            String articleName,
            Double unitPurchasePrice,
            Double unitSalePrice,
            Double marginAmount,
            String sourceType,
            Long sourceId) {

        CommercialStockMovement movement = new CommercialStockMovement();
        movement.setCreditId(creditId);
        movement.setCreditReference(creditReference);
        movement.setStockReturnId(stockReturnId);
        movement.setCollector(collector);
        movement.setMovementType(movementType);
        movement.setQuantityBefore(quantityBefore);
        movement.setQuantityMoved(quantityMoved);
        movement.setQuantityAfter(quantityAfter);
        movement.setOperationDate(LocalDateTime.now());
        movement.setUnitPurchasePrice(unitPurchasePrice);
        movement.setUnitSalePrice(unitSalePrice);
        movement.setMarginAmount(marginAmount);
        movement.setSourceType(sourceType);
        movement.setSourceId(sourceId);

        try {
            Optional<CommercialMonthlyStockItem> stockItemOpt = stockItemRepository.findById(stockItemId);
            if (stockItemOpt.isPresent()) {
                CommercialMonthlyStockItem stockItem = stockItemOpt.get();
                movement.setStockItem(stockItem);
                movement.setArticle(stockItem.getArticle());
            } else {
                log.error("Stock item not found for id: {}", stockItemId);
                return null;
            }

            CommercialStockMovement saved = repository.save(movement);
            log.debug("Stock movement recorded successfully: type={}, stockItemId={}", movementType, stockItemId);
            publishShadowEvent(movementType, collector, articleId, quantityMoved, unitPurchasePrice, unitSalePrice,
                    creditId, creditReference, stockReturnId, sourceId);
            return saved;
        } catch (Exception e) {
            log.error("Failed to record stock movement for stockItemId {}: {}", stockItemId, e.getMessage());
            return null;
        }
    }

    public List<CommercialStockMovement> getByStockItem(Long stockItemId) {
        return repository.findByStockItem_IdOrderByOperationDateDesc(stockItemId);
    }

    public List<CommercialStockMovement> getByCredit(Long creditId) {
        return repository.findByCreditIdOrderByOperationDateDesc(creditId);
    }

    public List<CommercialStockMovement> getByCollectorAndType(String collector, CommercialStockMovementType type) {
        return repository.findByCollectorAndMovementTypeOrderByOperationDateDesc(collector, type);
    }

    /** Double écriture vers le ledger continu `commercialstock` (traité après commit, sans effet sur ce flux). */
    private void publishShadowEvent(CommercialStockMovementType movementType, String collector, Long articleId,
                                    Integer quantityMoved, Double unitPurchasePrice, Double unitSalePrice,
                                    Long creditId, String creditReference, Long stockReturnId, Long sourceId) {
        if (eventPublisher == null || quantityMoved == null || articleId == null) {
            return;
        }
        int quantity = Math.abs(quantityMoved);
        LegacyStockMovementEvent event = switch (movementType) {
            case STOCK_IN -> shadow(LegacyStockMovementEvent.Kind.STOCK_IN, collector, articleId, quantity,
                    unitPurchasePrice, unitSalePrice, CommercialStockReferenceType.STOCK_REQUEST,
                    sourceId != null ? sourceId : stockReturnId, null);
            case CREDIT_SALE -> shadow(LegacyStockMovementEvent.Kind.SALE, collector, articleId, quantity,
                    unitPurchasePrice, unitSalePrice, CommercialStockReferenceType.CREDIT, creditId, creditReference);
            case RETURN -> shadow(LegacyStockMovementEvent.Kind.RETURN, collector, articleId, quantity,
                    unitPurchasePrice, unitSalePrice, CommercialStockReferenceType.STOCK_RETURN, stockReturnId, null);
            case SALE_CANCELLATION -> shadow(LegacyStockMovementEvent.Kind.SALE_CANCELLATION, collector, articleId,
                    quantity, unitPurchasePrice, unitSalePrice, CommercialStockReferenceType.CREDIT, creditId,
                    creditReference);
            case CASH_SALE, ADJUSTMENT -> null; // la vente comptant et les ajustements n'alimentent pas le ledger continu
        };
        if (event != null) {
            eventPublisher.publishEvent(event);
        }
    }

    private static LegacyStockMovementEvent shadow(LegacyStockMovementEvent.Kind kind, String collector, Long articleId,
                                                   int quantity, Double purchase, Double sale,
                                                   CommercialStockReferenceType refType, Long refId, String refCode) {
        return new LegacyStockMovementEvent(kind, StockActivityType.CREDIT, collector, articleId, quantity, purchase,
                sale, refType, refId, refCode, null, LocalDate.now(), null);
    }
}
