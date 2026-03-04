package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.CreditArticles;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("SELECT ca FROM CreditArticles ca WHERE ca.credit.id IN :creditIds")
    Set<CreditArticles> findByCreditIds(@Param("creditIds") List<Long> creditIds);
}
