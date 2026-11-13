package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.article.ArticleSalePack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArticleSalePackRepository extends JpaRepository<ArticleSalePack, Long> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ArticleSalePack p where p.article.id = :articleId")
    void deleteByArticleId(@Param("articleId") Long articleId);
}
