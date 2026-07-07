package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockReceptionItemRepository extends BaseRepository<StockReceptionItem, Long, Long> {

    Page<StockReceptionItem> findByStockReceptionId(Long stockReceptionId, Pageable pageable);

    @Query("""
            SELECT sri FROM StockReceptionItem sri
            JOIN sri.stockReception sr
            WHERE sri.article.id = :articleId
            ORDER BY sr.receptionDate ASC, sri.id ASC
            """)
    List<StockReceptionItem> findByArticleIdOrderByReceptionDateAsc(@Param("articleId") Long articleId);
}

