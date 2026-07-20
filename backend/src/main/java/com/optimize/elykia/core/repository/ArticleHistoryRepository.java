package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ArticleHistoryRepository extends GenericRepository<ArticleHistory, Long> {
    List<ArticleHistory> findByArticles_IdOrderByIdDesc(Long articleId);

    @Query("""
            SELECT h FROM ArticleHistory h
            WHERE h.articles.id = :articleId
              AND h.occurredAt > :fromExclusive
              AND h.occurredAt <= :toInclusive
            ORDER BY h.occurredAt ASC, h.id ASC
            """)
    List<ArticleHistory> findByArticleIdAndOccurredAtBetweenOrderByOccurredAtAsc(
            @Param("articleId") Long articleId,
            @Param("fromExclusive") LocalDateTime fromExclusive,
            @Param("toInclusive") LocalDateTime toInclusive);
}
