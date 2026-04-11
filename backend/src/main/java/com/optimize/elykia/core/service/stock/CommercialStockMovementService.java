package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class CommercialStockMovementService {

    private final CommercialStockMovementRepository repository;

    public CommercialStockMovementService(CommercialStockMovementRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        try {
            CommercialStockMovement saved = repository.save(movement);
            log.debug("Stock movement recorded successfully: type={}, stockItemId={}", movementType, stockItemId);
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
}
