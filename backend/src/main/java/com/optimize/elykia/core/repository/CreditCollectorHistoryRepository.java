package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.CreditCollectorHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditCollectorHistoryRepository extends JpaRepository<CreditCollectorHistory, Long> {
    List<CreditCollectorHistory> findByCreditIdOrderByChangeDateDesc(Long creditId);
}
