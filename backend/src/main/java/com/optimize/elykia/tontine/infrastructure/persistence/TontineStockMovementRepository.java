package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineStockMovement;
import com.optimize.elykia.tontine.domain.TontineStockMovementType;

import java.util.List;

public interface TontineStockMovementRepository extends GenericRepository<TontineStockMovement, Long> {

    List<TontineStockMovement> findByTontineStockIdOrderByOperationDateDesc(Long tontineStockId);

    List<TontineStockMovement> findByCreditIdOrderByOperationDateDesc(Long creditId);

    List<TontineStockMovement> findByCollectorOrderByOperationDateDesc(String collector);

    List<TontineStockMovement> findByCollectorAndMovementTypeOrderByOperationDateDesc(
            String collector, TontineStockMovementType movementType);
}
