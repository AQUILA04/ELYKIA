package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.CreditReturnHistory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditReturnHistoryRepository extends GenericRepository<CreditReturnHistory, Long> {
    List<CreditReturnHistory> findByCreditId(Long creditId);
    List<CreditReturnHistory> findByArticleId(Long articleId);
}