package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;

import java.util.List;

public interface CommercialStockMovementRepository extends GenericRepository<CommercialStockMovement, Long> {

    List<CommercialStockMovement> findByStockItem_IdOrderByOperationDateDesc(Long stockItemId);

    List<CommercialStockMovement> findByCredit_IdOrderByOperationDateDesc(Long creditId);

    List<CommercialStockMovement> findByCollectorAndMovementTypeOrderByOperationDateDesc(
            String collector, CommercialStockMovementType type);
}
