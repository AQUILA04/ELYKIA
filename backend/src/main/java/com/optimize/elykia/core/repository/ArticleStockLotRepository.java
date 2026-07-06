package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ArticleStockLotRepository extends GenericRepository<ArticleStockLot, Long> {

    @Query("""
            SELECT l FROM ArticleStockLot l
            WHERE l.article.id = :articleId
              AND l.status = :status
              AND l.quantityRemaining > 0
            ORDER BY l.entryDate ASC, l.id ASC
            """)
    List<ArticleStockLot> findOpenLotsForArticleOrderByFifo(
            @Param("articleId") Long articleId,
            @Param("status") ArticleStockLotStatus status);

    @Query("""
            SELECT COALESCE(SUM(l.quantityRemaining * l.unitPurchasePrice), 0)
            FROM ArticleStockLot l
            WHERE l.article.id = :articleId
              AND l.quantityRemaining > 0
            """)
    Double sumRemainingValuationByArticleId(@Param("articleId") Long articleId);

    @Query("""
            SELECT COALESCE(SUM(l.quantityRemaining), 0)
            FROM ArticleStockLot l
            WHERE l.article.id = :articleId
              AND l.quantityRemaining > 0
            """)
    Integer sumRemainingQuantityByArticleId(@Param("articleId") Long articleId);

    @Query("""
            SELECT COALESCE(SUM(l.quantityRemaining * l.unitPurchasePrice), 0)
            FROM ArticleStockLot l
            WHERE l.quantityRemaining > 0
            """)
    Double sumTotalRemainingValuation();

    @Query("""
            SELECT COALESCE(SUM(a.creditSalePrice * l.quantityRemaining), 0)
            FROM ArticleStockLot l
            JOIN l.article a
            WHERE l.quantityRemaining > 0
            """)
    Double sumCreditSaleValuationFromLots();

    @Query("""
            SELECT COALESCE(SUM(a.sellingPrice * l.quantityRemaining), 0)
            FROM ArticleStockLot l
            JOIN l.article a
            WHERE l.quantityRemaining > 0
            """)
    Double sumSellingSaleValuationFromLots();

    boolean existsByArticleId(Long articleId);

    long countByArticleId(Long articleId);

    java.util.Optional<ArticleStockLot> findByStockReceptionItemId(Long stockReceptionItemId);
}
