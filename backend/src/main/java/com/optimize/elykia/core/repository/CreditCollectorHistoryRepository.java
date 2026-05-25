package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.sale.CreditCollectorHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditCollectorHistoryRepository extends JpaRepository<CreditCollectorHistory, Long> {
    List<CreditCollectorHistory> findByCreditIdOrderByChangeDateDesc(Long creditId);

    @Modifying
    @Query(value = "INSERT INTO credit_collector_history (credit_id, old_collector, new_collector, total_amount, total_amount_paid, total_amount_remaining, change_date, DATE_REG, DATE_MOD, visibility, REG_USER_ID, MOD_USER_ID) " +
            "SELECT id, collector, :newCollector, total_amount, total_amount_paid, total_amount_remaining, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ENABLED', :regUserId, :modUserId " +
            "FROM credit WHERE id IN :ids", nativeQuery = true)
    void bulkInsertHistoryForCredits(@Param("ids") List<Long> ids, @Param("newCollector") String newCollector, @Param("regUserId") String regUserId, @Param("modUserId") String modUserId);
}
