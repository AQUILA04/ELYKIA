package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.article.ArticleHistory;

import java.util.List;

public interface ArticleHistoryRepository extends GenericRepository<ArticleHistory, Long> {
    List<ArticleHistory> findByArticles_IdOrderByOperationDateDesc(Long articleId);
}
