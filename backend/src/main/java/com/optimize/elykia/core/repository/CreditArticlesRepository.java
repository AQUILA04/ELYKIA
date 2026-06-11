package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface CreditArticlesRepository extends GenericRepository<CreditArticles, Long> {

    @Query("SELECT ca.articles, SUM(ca.quantity) as totalQuantity " +
            "FROM CreditArticles ca " +
            "GROUP BY ca.articles " +
            "ORDER BY totalQuantity DESC")
    List<Object[]> findTop10ArticlesWithHighestQuantity(Pageable pageable);

    Set<CreditArticles> findByCredit_id(Long creditId);

    @Query("SELECT c.reference as reference, CONCAT(cl.firstname, ' ', cl.lastname) as clientName, ca.quantity as quantity " +
            "FROM CreditArticles ca " +
            "JOIN ca.credit c " +
            "JOIN c.client cl " +
            "WHERE ca.stockItemId = :stockItemId")
    List<com.optimize.elykia.core.dto.CreditArticleDetailDto> findDetailsByStockItemId(@Param("stockItemId") Long stockItemId);

    @Query("SELECT c.reference as reference, CONCAT(cl.firstname, ' ', cl.lastname) as clientName, ca.quantity as quantity " +
            "FROM CreditArticles ca " +
            "JOIN ca.credit c " +
            "JOIN c.client cl " +
            "WHERE ca.tontineItemId = :tontineItemId")
    List<com.optimize.elykia.core.dto.CreditArticleDetailDto> findDetailsByTontineItemId(@Param("tontineItemId") Long tontineItemId);

    @Query("SELECT ca FROM CreditArticles ca WHERE ca.credit.id IN :creditIds")
    Set<CreditArticles> findByCreditIds(@Param("creditIds") List<Long> creditIds);

    @Query("""
            SELECT DISTINCT ca.credit.id
            FROM CreditArticles ca
            WHERE ca.stockItemId IN :stockItemIds
            """)
    List<Long> findCreditIdsByStockItemIds(@Param("stockItemIds") Collection<Long> stockItemIds);

    @Query("""
            SELECT COUNT(ca)
            FROM CreditArticles ca
            WHERE ca.credit.id = :creditId
              AND ca.stockItemId IS NOT NULL
              AND ca.stockItemId NOT IN :stockItemIds
            """)
    long countLinkedArticlesOutsideStockItems(
            @Param("creditId") Long creditId,
            @Param("stockItemIds") Collection<Long> stockItemIds);

    @Query("""
            SELECT COUNT(ca)
            FROM CreditArticles ca
            WHERE ca.credit.id = :creditId
              AND ca.stockItemId IN :stockItemIds
            """)
    long countLinkedArticlesOnStockItems(
            @Param("creditId") Long creditId,
            @Param("stockItemIds") Collection<Long> stockItemIds);

    @Query("""
            SELECT ca.credit.id AS creditId,
                   SUM(ca.quantity * COALESCE(NULLIF(ca.unitPrice, 0), ca.articles.sellingPrice, 0)) AS soldValue
            FROM CreditArticles ca
            WHERE ca.stockItemId IN :stockItemIds
            GROUP BY ca.credit.id
            """)
    List<com.optimize.elykia.core.dto.stock.CreditSoldAmountOnStockProjection> sumSoldValueByCreditForStockItemIds(
            @Param("stockItemIds") Collection<Long> stockItemIds);

    @Query("""
            SELECT ca.credit.id AS creditId,
                   SUM(ca.quantity * COALESCE(NULLIF(ca.unitPrice, 0), ca.articles.sellingPrice, 0)) AS soldValue
            FROM CreditArticles ca
            JOIN ca.credit c
            WHERE ca.articles.id IN :articleIds
              AND c.collector = :collector
              AND c.beginDate >= :monthStart
              AND c.beginDate < :monthEnd
            GROUP BY ca.credit.id
            """)
    List<com.optimize.elykia.core.dto.stock.CreditSoldAmountOnStockProjection> sumSoldValueByCreditForMonthlyStock(
            @Param("collector") String collector,
            @Param("monthStart") LocalDate monthStart,
            @Param("monthEnd") LocalDate monthEnd,
            @Param("articleIds") Collection<Long> articleIds);

    @Query("""
            SELECT DISTINCT ca.credit.id
            FROM CreditArticles ca
            JOIN ca.credit c
            WHERE ca.articles.id IN :articleIds
              AND c.collector = :collector
              AND c.beginDate >= :monthStart
              AND c.beginDate < :monthEnd
            """)
    List<Long> findCreditIdsForMonthlyStock(
            @Param("collector") String collector,
            @Param("monthStart") LocalDate monthStart,
            @Param("monthEnd") LocalDate monthEnd,
            @Param("articleIds") Collection<Long> articleIds);
}
