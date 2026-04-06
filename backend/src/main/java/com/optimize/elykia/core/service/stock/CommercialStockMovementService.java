package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
@Slf4j
public class CommercialStockMovementService {

    private final CommercialStockMovementRepository repository;

    public CommercialStockMovementService(CommercialStockMovementRepository repository) {
        this.repository = repository;
    }

    public CommercialStockMovement record(
            CommercialMonthlyStockItem stockItem,
            Credit credit,
            CommercialStockMovementType movementType,
            Integer quantityBefore,
            Integer quantityMoved,
            Integer quantityAfter) {
        return recordWithStockReturn(stockItem, credit, movementType, quantityBefore, quantityMoved, quantityAfter, null);
    }

    public CommercialStockMovement recordWithStockReturn(
            CommercialMonthlyStockItem stockItem,
            Credit credit,
            CommercialStockMovementType movementType,
            Integer quantityBefore,
            Integer quantityMoved,
            Integer quantityAfter,
            Long stockReturnId) {

        CommercialStockMovement movement = new CommercialStockMovement();
        movement.setStockItem(stockItem);
        movement.setCredit(credit);
        movement.setCreditReference(credit != null ? credit.getReference() : null);
        movement.setStockReturnId(stockReturnId);
        movement.setCollector(stockItem.getMonthlyStock().getCollector());
        movement.setArticle(stockItem.getArticle());
        movement.setMovementType(movementType);
        movement.setQuantityBefore(quantityBefore);
        movement.setQuantityMoved(quantityMoved);
        movement.setQuantityAfter(quantityAfter);
        movement.setOperationDate(LocalDateTime.now());

        try {
            return repository.save(movement);
        } catch (Exception e) {
            log.error("Failed to record stock movement for stockItem {}: {}",
                    stockItem.getId(), e.getMessage());
            return null;
        }
    }

    public List<CommercialStockMovement> getByStockItem(Long stockItemId) {
        return repository.findByStockItem_IdOrderByOperationDateDesc(stockItemId);
    }

    public List<CommercialStockMovement> getByCredit(Long creditId) {
        return repository.findByCredit_IdOrderByOperationDateDesc(creditId);
    }

    public List<CommercialStockMovement> getByCollectorAndType(String collector, CommercialStockMovementType type) {
        return repository.findByCollectorAndMovementTypeOrderByOperationDateDesc(collector, type);
    }
}
