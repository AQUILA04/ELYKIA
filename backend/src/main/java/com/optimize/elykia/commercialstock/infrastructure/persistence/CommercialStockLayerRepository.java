package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.domain.CommercialStockLayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommercialStockLayerRepository extends JpaRepository<CommercialStockLayer, Long> {

    @Query("SELECT l FROM CommercialStockLayer l JOIN FETCH l.position WHERE l.originWarehouseLotId = :lotId ORDER BY l.acquiredAt ASC, l.id ASC")
    List<CommercialStockLayer> findByOriginWarehouseLotIdWithPosition(@Param("lotId") Long lotId);
}
