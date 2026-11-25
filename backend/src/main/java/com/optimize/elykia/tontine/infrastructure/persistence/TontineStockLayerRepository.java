package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.tontine.domain.TontineStockLayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLayerRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
public interface TontineStockLayerRepository extends JpaRepository<TontineStockLayer, Long> {

    List<TontineStockLayer> findByTontineStockIdAndQuantityRemainingGreaterThanOrderByIdAsc(
            Long tontineStockId, int remaining);
}
