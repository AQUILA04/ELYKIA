package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.tontine.TontineStockLayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TontineStockLayerRepository extends JpaRepository<TontineStockLayer, Long> {

    List<TontineStockLayer> findByTontineStockIdAndQuantityRemainingGreaterThanOrderByIdAsc(
            Long tontineStockId, int remaining);
}
