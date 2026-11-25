package com.optimize.elykia.inventory.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.inventory.domain.ArticleStockLotConsumption;

public interface ArticleStockLotConsumptionRepository extends GenericRepository<ArticleStockLotConsumption, Long> {
    java.util.List<ArticleStockLotConsumption> findByLotIdOrderByIdAsc(Long lotId);
}
