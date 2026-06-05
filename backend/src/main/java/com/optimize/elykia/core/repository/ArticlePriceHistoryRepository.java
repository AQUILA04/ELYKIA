package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.article.ArticlePriceHistory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticlePriceHistoryRepository extends GenericRepository<ArticlePriceHistory, Long> {
    List<ArticlePriceHistory> findByArticle_IdOrderByCreatedDateDesc(Long articleId);
}
