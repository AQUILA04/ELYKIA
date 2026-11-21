package com.optimize.elykia.inventory.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.inventory.domain.ArticleStateHistory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleStateHistoryRepository extends GenericRepository<ArticleStateHistory, Long> {
    List<ArticleStateHistory> findByArticle_IdOrderByCreatedDateDesc(Long articleId);
}
