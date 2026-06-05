package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.entity.stock.TontineStockMovement;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.repository.TontineStockMovementRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class TontineStockMovementService {

    private final TontineStockMovementRepository repository;

    public TontineStockMovementService(TontineStockMovementRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public TontineStockMovement record(
            Long tontineStockId,
            Long creditId,
            String creditReference,
            Long stockTontineRequestId,
            String stockTontineRequestReference,
            Long stockTontineReturnId,
            Long tontineDeliveryId,
            String tontineDeliveryReference,
            String collector,
            Long articleId,
            String articleName,
            TontineStockMovementType movementType,
            Integer quantityBefore,
            Integer quantityMoved,
            Integer quantityAfter) {

        TontineStockMovement movement = new TontineStockMovement();
        movement.setTontineStockId(tontineStockId);
        movement.setCreditId(creditId);
        movement.setCreditReference(creditReference);
        movement.setStockTontineRequestId(stockTontineRequestId);
        movement.setStockTontineRequestReference(stockTontineRequestReference);
        movement.setStockTontineReturnId(stockTontineReturnId);
        movement.setTontineDeliveryId(tontineDeliveryId);
        movement.setTontineDeliveryReference(tontineDeliveryReference);
        movement.setCollector(collector);
        movement.setArticleId(articleId);
        movement.setArticleName(articleName);
        movement.setMovementType(movementType);
        movement.setQuantityBefore(quantityBefore);
        movement.setQuantityMoved(quantityMoved);
        movement.setQuantityAfter(quantityAfter);
        movement.setOperationDate(LocalDateTime.now());

        try {
            TontineStockMovement saved = repository.save(movement);
            log.debug("Tontine stock movement recorded: type={}, tontineStockId={}", movementType, tontineStockId);
            return saved;
        } catch (Exception e) {
            log.error("Failed to record tontine stock movement for tontineStockId {}: {}", tontineStockId, e.getMessage());
            return null;
        }
    }

    public List<TontineStockMovement> getByTontineStock(Long tontineStockId) {
        return repository.findByTontineStockIdOrderByOperationDateDesc(tontineStockId);
    }

    public List<TontineStockMovement> getByCredit(Long creditId) {
        return repository.findByCreditIdOrderByOperationDateDesc(creditId);
    }

    public List<TontineStockMovement> getByCollector(String collector) {
        return repository.findByCollectorOrderByOperationDateDesc(collector);
    }

    public List<TontineStockMovement> getByCollectorAndType(String collector, TontineStockMovementType type) {
        return repository.findByCollectorAndMovementTypeOrderByOperationDateDesc(collector, type);
    }
}
