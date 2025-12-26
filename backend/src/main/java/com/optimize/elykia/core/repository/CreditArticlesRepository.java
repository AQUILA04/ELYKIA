package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.CreditArticles;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface CreditArticlesRepository extends GenericRepository<CreditArticles, Long> {

    @Query("SELECT ca.articles, SUM(ca.quantity) as totalQuantity " +
            "FROM CreditArticles ca " +
            "GROUP BY ca.articles " +
            "ORDER BY totalQuantity DESC")
    List<Object[]> findTop10ArticlesWithHighestQuantity(Pageable pageable);

    Set<CreditArticles> findByCredit_id(Long creditId);
}
