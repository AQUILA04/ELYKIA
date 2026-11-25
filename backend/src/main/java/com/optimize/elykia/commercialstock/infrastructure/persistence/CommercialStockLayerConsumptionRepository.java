package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.domain.CommercialStockLayerConsumption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommercialStockLayerConsumptionRepository extends JpaRepository<CommercialStockLayerConsumption, Long> {

    List<CommercialStockLayerConsumption> findByMovementId(Long movementId);

    List<CommercialStockLayerConsumption> findByLayerIdOrderByIdAsc(Long layerId);
}
