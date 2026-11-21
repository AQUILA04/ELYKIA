package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.elykia.sale.domain.CreditDailyStakeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditDailyStakeHistoryRepository extends JpaRepository<CreditDailyStakeHistory, Long> {
    List<CreditDailyStakeHistory> findByCreditIdOrderByChangeDateDesc(Long creditId);
}