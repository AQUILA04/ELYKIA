package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineStockMovement;
import com.optimize.elykia.tontine.domain.TontineStockMovementType;

import java.util.List;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLedgerEntryRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
public interface TontineStockMovementRepository extends GenericRepository<TontineStockMovement, Long> {

    List<TontineStockMovement> findByTontineStockIdOrderByOperationDateDesc(Long tontineStockId);

    List<TontineStockMovement> findByCreditIdOrderByOperationDateDesc(Long creditId);

    List<TontineStockMovement> findByCollectorOrderByOperationDateDesc(String collector);

    List<TontineStockMovement> findByCollectorAndMovementTypeOrderByOperationDateDesc(
            String collector, TontineStockMovementType movementType);
}
