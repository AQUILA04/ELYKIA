package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.sale.CreditCollectorHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CreditCollectorHistoryRepository extends JpaRepository<CreditCollectorHistory, Long> {
    List<CreditCollectorHistory> findByCreditIdOrderByChangeDateDesc(Long creditId);

    @Modifying
    @Query(value = "INSERT INTO credit_collector_history (credit_id, old_collector, new_collector, total_amount, total_amount_paid, total_amount_remaining, change_date, DATE_REG, DATE_MOD, visibility, REG_USER_ID, MOD_USER_ID) " +
            "SELECT id, collector, :newCollector, total_amount, total_amount_paid, total_amount_remaining, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ENABLED', :regUserId, :modUserId " +
            "FROM credit WHERE id IN :ids", nativeQuery = true)
    void bulkInsertHistoryForCredits(@Param("ids") List<Long> ids, @Param("newCollector") String newCollector, @Param("regUserId") String regUserId, @Param("modUserId") String modUserId);

    @Modifying
    @Query(value = """
            INSERT INTO credit_collector_history (credit_id, old_collector, new_collector, total_amount, total_amount_paid, total_amount_remaining, change_date, DATE_REG, DATE_MOD, visibility, REG_USER_ID, MOD_USER_ID)
            SELECT id, collector, :newCollector, total_amount, total_amount_paid, total_amount_remaining, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ENABLED', :regUserId, :modUserId
            FROM credit
            WHERE client_id IN :clientIds AND status = 'INPROGRESS' AND collector <> :newCollector
            """, nativeQuery = true)
    void bulkInsertHistoryForInProgressCreditsByClientIds(
            @Param("clientIds") List<Long> clientIds,
            @Param("newCollector") String newCollector,
            @Param("regUserId") String regUserId,
            @Param("modUserId") String modUserId);

    @Query(value = """
            WITH filtered AS (
                SELECT h.id,
                       h.credit_id,
                       h.old_collector,
                       h.new_collector,
                       h.total_amount,
                       h.total_amount_paid,
                       h.total_amount_remaining,
                       h.change_date,
                       h.reg_user_id
                FROM credit_collector_history h
                WHERE h.visibility = 'ENABLED'
                  AND (CAST(:oldCollector AS text) IS NULL OR UPPER(h.old_collector) = UPPER(CAST(:oldCollector AS text)))
                  AND (CAST(:newCollector AS text) IS NULL OR UPPER(h.new_collector) = UPPER(CAST(:newCollector AS text)))
                  AND (CAST(:fromDate AS timestamp) IS NULL OR h.change_date >= CAST(:fromDate AS timestamp))
                  AND (CAST(:toDate AS timestamp) IS NULL OR h.change_date < CAST(:toDate AS timestamp))
            ),
            latest_per_credit AS (
                SELECT DISTINCT ON (f.credit_id)
                       f.id,
                       f.credit_id,
                       f.old_collector,
                       f.new_collector,
                       f.total_amount,
                       f.total_amount_paid,
                       f.total_amount_remaining,
                       f.change_date,
                       f.reg_user_id
                FROM filtered f
                ORDER BY f.credit_id, f.change_date DESC, f.id DESC
            )
            SELECT l.old_collector,
                   l.new_collector,
                   COUNT(*)::bigint,
                   COALESCE(SUM(l.total_amount), 0),
                   COALESCE(SUM(l.total_amount_paid), 0),
                   COALESCE(SUM(l.total_amount_remaining), 0),
                   MIN(l.change_date),
                   MAX(l.change_date)
            FROM latest_per_credit l
            GROUP BY l.old_collector, l.new_collector
            ORDER BY MAX(l.change_date) DESC
            """, nativeQuery = true)
    List<Object[]> aggregateByCollectorPair(
            @Param("oldCollector") String oldCollector,
            @Param("newCollector") String newCollector,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate);

    @Query(value = """
            WITH filtered AS (
                SELECT h.id,
                       h.credit_id,
                       h.old_collector,
                       h.new_collector,
                       h.total_amount,
                       h.total_amount_paid,
                       h.total_amount_remaining,
                       h.change_date,
                       h.reg_user_id
                FROM credit_collector_history h
                WHERE h.visibility = 'ENABLED'
                  AND (CAST(:oldCollector AS text) IS NULL OR UPPER(h.old_collector) = UPPER(CAST(:oldCollector AS text)))
                  AND (CAST(:newCollector AS text) IS NULL OR UPPER(h.new_collector) = UPPER(CAST(:newCollector AS text)))
                  AND (CAST(:fromDate AS timestamp) IS NULL OR h.change_date >= CAST(:fromDate AS timestamp))
                  AND (CAST(:toDate AS timestamp) IS NULL OR h.change_date < CAST(:toDate AS timestamp))
            ),
            latest_per_credit AS (
                SELECT DISTINCT ON (f.credit_id)
                       f.id,
                       f.credit_id,
                       f.old_collector,
                       f.new_collector,
                       f.total_amount,
                       f.total_amount_paid,
                       f.total_amount_remaining,
                       f.change_date,
                       f.reg_user_id
                FROM filtered f
                ORDER BY f.credit_id, f.change_date DESC, f.id DESC
            )
            SELECT l.id,
                   c.id,
                   c.reference,
                   c.status,
                   TRIM(CONCAT(COALESCE(cl.lastname, ''), ' ', COALESCE(cl.firstname, ''))),
                   cl.phone,
                   l.old_collector,
                   l.new_collector,
                   l.total_amount,
                   l.total_amount_paid,
                   l.total_amount_remaining,
                   c.total_amount_paid,
                   c.total_amount_remaining,
                   l.change_date,
                   l.reg_user_id
            FROM latest_per_credit l
            JOIN credit c ON c.id = l.credit_id
            LEFT JOIN client cl ON cl.id = c.client_id
            ORDER BY l.change_date DESC, c.reference
            """, nativeQuery = true)
    List<Object[]> findTransferDetails(
            @Param("oldCollector") String oldCollector,
            @Param("newCollector") String newCollector,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate);

    @Query(value = """
            SELECT COALESCE(SUM(h.total_amount_remaining), 0)
            FROM credit_collector_history h
            WHERE h.visibility = 'ENABLED'
              AND UPPER(h.new_collector) = UPPER(CAST(:collector AS text))
              AND h.change_date >= CAST(:fromDate AS timestamp)
              AND h.change_date < CAST(:toDate AS timestamp)
            """, nativeQuery = true)
    Double sumCreditsReceivedInPeriod(
            @Param("collector") String collector,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate);

    @Query(value = """
            SELECT COALESCE(SUM(h.total_amount_remaining), 0)
            FROM credit_collector_history h
            WHERE h.visibility = 'ENABLED'
              AND UPPER(h.old_collector) = UPPER(CAST(:collector AS text))
              AND h.change_date >= CAST(:fromDate AS timestamp)
              AND h.change_date < CAST(:toDate AS timestamp)
            """, nativeQuery = true)
    Double sumCreditsCededInPeriod(
            @Param("collector") String collector,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate);
}
