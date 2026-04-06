package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.sale.CreditDailyStakeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditDailyStakeHistoryRepository extends JpaRepository<CreditDailyStakeHistory, Long> {
    List<CreditDailyStakeHistory> findByCreditIdOrderByChangeDateDesc(Long creditId);
}