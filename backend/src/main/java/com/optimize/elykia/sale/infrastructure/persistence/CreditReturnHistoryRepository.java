package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.CreditReturnHistory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditReturnHistoryRepository extends GenericRepository<CreditReturnHistory, Long> {
    List<CreditReturnHistory> findByCreditId(Long creditId);
    List<CreditReturnHistory> findByArticleId(Long articleId);
}