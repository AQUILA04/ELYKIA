package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.ArticleStateHistory;
import org.springframework.stereotype.Repository;

@Repository
public interface ArticleStateHistoryRepository extends GenericRepository<ArticleStateHistory, Long> {
}
