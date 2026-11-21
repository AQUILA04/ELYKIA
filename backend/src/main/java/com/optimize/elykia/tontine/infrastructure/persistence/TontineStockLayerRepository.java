package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.tontine.domain.TontineStockLayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TontineStockLayerRepository extends JpaRepository<TontineStockLayer, Long> {

    List<TontineStockLayer> findByTontineStockIdAndQuantityRemainingGreaterThanOrderByIdAsc(
            Long tontineStockId, int remaining);
}
