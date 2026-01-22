package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.entity.StockReceptionItem;
import org.springframework.stereotype.Repository;

@Repository
public interface StockReceptionItemRepository extends BaseRepository<StockReceptionItem, Long, Long> {
}
