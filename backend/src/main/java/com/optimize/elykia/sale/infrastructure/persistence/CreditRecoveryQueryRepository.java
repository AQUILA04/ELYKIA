package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.web.dto.DailyUnrecoveredCreditDto;
import com.optimize.elykia.sale.web.dto.RemainingAtClientsCreditDto;
import com.optimize.elykia.shared.carnet.RmFieldListProgressSql;
import com.optimize.elykia.shared.domain.OperationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Requêtes lecture seule de recouvrement journalier, retards, échéances, reste chez les clients
 * et indicateurs terrain portés sur {@link Credit}.
 */
public interface CreditRecoveryQueryRepository extends Repository<Credit, Long> {

    List<Credit> findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(
            CreditStatus status, String username, ClientType clientType);

    Page<Credit> findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(
            CreditStatus status, String username, ClientType clientType, Pageable pageable);

    @Query("""
            SELECT new com.optimize.elykia.sale.web.dto.DailyUnrecoveredCreditDto(
                c.id, c.reference, c.dailyStake, c.totalAmountRemaining, cl.id,
                cl.firstname, cl.lastname, cl.quarter, cl.occupation
            )
            FROM Credit c
            JOIN c.client cl
            LEFT JOIN CreditTimeline ct ON ct.credit = c
                AND ct.state = com.optimize.common.entities.enums.State.ENABLED
                AND ct.createdDate >= :dayStart
                AND ct.createdDate < :dayEnd
            WHERE c.status = :status
            AND c.collector = :collector
            AND c.clientType = :clientType
            AND c.state = com.optimize.common.entities.enums.State.ENABLED
            AND ct IS NULL
            ORDER BY cl.quarter ASC, cl.lastname ASC, cl.firstname ASC
            """)
    List<DailyUnrecoveredCreditDto> findUnrecoveredCreditsForDay(
            @Param("status") CreditStatus status,
            @Param("collector") String collector,
            @Param("clientType") ClientType clientType,
            @Param("dayStart") LocalDateTime dayStart,
            @Param("dayEnd") LocalDateTime dayEnd);

    @Query(value = """
            SELECT new com.optimize.elykia.sale.web.dto.DailyUnrecoveredCreditDto(
                c.id, c.reference, c.dailyStake, c.totalAmountRemaining, cl.id,
                cl.firstname, cl.lastname, cl.quarter, cl.occupation
            )
            FROM Credit c
            JOIN c.client cl
            LEFT JOIN CreditTimeline ct ON ct.credit = c
                AND ct.state = com.optimize.common.entities.enums.State.ENABLED
                AND ct.createdDate >= :dayStart
                AND ct.createdDate < :dayEnd
            WHERE c.status = :status
            AND c.collector = :collector
            AND c.clientType = :clientType
            AND c.state = com.optimize.common.entities.enums.State.ENABLED
            AND ct IS NULL
            ORDER BY cl.quarter ASC, cl.lastname ASC, cl.firstname ASC
            """,
            countQuery = """
            SELECT COUNT(c)
            FROM Credit c
            JOIN c.client cl
            LEFT JOIN CreditTimeline ct ON ct.credit = c
                AND ct.state = com.optimize.common.entities.enums.State.ENABLED
                AND ct.createdDate >= :dayStart
                AND ct.createdDate < :dayEnd
            WHERE c.status = :status
            AND c.collector = :collector
            AND c.clientType = :clientType
            AND c.state = com.optimize.common.entities.enums.State.ENABLED
            AND ct IS NULL
            """)
    Page<DailyUnrecoveredCreditDto> findUnrecoveredCreditsForDay(
            @Param("status") CreditStatus status,
            @Param("collector") String collector,
            @Param("clientType") ClientType clientType,
            @Param("dayStart") LocalDateTime dayStart,
            @Param("dayEnd") LocalDateTime dayEnd,
            Pageable pageable);

    @Query(value = "SELECT sum(c.daily_stake * get_days_between_dates(cast(c.begin_date as date), cast(c.expected_end_date as date))) FROM credit c WHERE c.collector = :commercial and c.client_type = 'CLIENT' and c.status = 'INPROGRESS'", nativeQuery = true)
    Double getTotalAmountDueTodayByCommercial(String commercial);

    @Query(value = "SELECT sum(((c.daily_stake * get_days_between_dates(cast(c.begin_date as date), cast(c.expected_end_date as date))) + c.advance)) FROM credit c WHERE c.client_id = :clientId and c.status = 'INPROGRESS'", nativeQuery = true)
    Double getTotalAmountDueTodayByClientId(Long clientId);

    @Query(value = "SELECT c.* FROM Credit c WHERE c.status = 'INPROGRESS' AND ((get_days_between_dates(c.begin_date, c.expected_end_date) * c.daily_stake) > c.total_amount_paid) AND c.client_type = 'CLIENT' AND c.collector = :collector", nativeQuery = true)
    Page<Credit> getDelayedCredits(String collector, Pageable pageable);

    @Query(value = "SELECT c.* FROM Credit c WHERE c.status = 'INPROGRESS' AND ((30 - get_days_between_dates(c.begin_date, c.expected_end_date)) < 7  ) AND c.client_type = 'CLIENT' AND c.collector = :collector", nativeQuery = true)
    Page<Credit> getEndingCredits(String collector, Pageable pageable);

    @Query("""
        SELECT DISTINCT cl.quarter FROM Credit c
        JOIN c.client cl
        WHERE c.collector = :collector
          AND c.state = 'ENABLED'
          AND cl.quarter IS NOT NULL
          AND TRIM(cl.quarter) <> ''
        """)
    List<String> findDistinctClientQuartersByCollector(@Param("collector") String collector);

    // ==========================================
    // CRÉDITS EN RETARD
    // ==========================================

    @Query(value = """
        SELECT c.* FROM credit c 
        WHERE c.status = 'INPROGRESS'
          AND (
               CAST(c.expected_end_date AS DATE) < CURRENT_DATE
               OR 
               (c.daily_stake > 0 AND c.total_amount_paid < (c.daily_stake * get_days_between_dates(CAST(c.begin_date AS DATE), CAST(LEAST(CURRENT_DATE, c.expected_end_date) AS DATE))))
          )
    """, nativeQuery = true)
    List<Credit> findLateCredits();

    @Query(value = """
        SELECT c.* FROM credit c 
        WHERE c.status = 'INPROGRESS'
          AND c.collector = :collector
          AND (
               CAST(c.expected_end_date AS DATE) < CURRENT_DATE
               OR 
               (c.daily_stake > 0 AND c.total_amount_paid < (c.daily_stake * get_days_between_dates(CAST(c.begin_date AS DATE), CAST(LEAST(CURRENT_DATE, c.expected_end_date) AS DATE))))
          )
    """, nativeQuery = true)
    List<Credit> findLateCreditsByCollector(@Param("collector") String collector);

    /**
     * Page of late credits for the recovery-manager field list.
     * {@code search} and {@code digits} are already folded (lowercase, no accents). Empty string means no filter.
     */
    @Query(value = """
        SELECT c.* FROM credit c
        LEFT JOIN client cl ON cl.id = c.client_id
        WHERE c.status = 'INPROGRESS'
          AND (
               CAST(c.expected_end_date AS DATE) < CURRENT_DATE
               OR
               (c.daily_stake > 0 AND c.total_amount_paid < (c.daily_stake * get_days_between_dates(CAST(c.begin_date AS DATE), CAST(LEAST(CURRENT_DATE, c.expected_end_date) AS DATE))))
          )
          AND (
               :search = ''
               OR translate(lower(coalesce(cl.firstname, '') || ' ' || coalesce(cl.lastname, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(cl.quarter, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(c.collector, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR lower(coalesce(c.reference, '')) LIKE '%' || :search || '%'
               OR (:digits <> '' AND regexp_replace(coalesce(cl.phone, ''), '\\D', '', 'g') LIKE '%' || :digits || '%')
          )
        ORDER BY cl.lastname ASC NULLS LAST, cl.firstname ASC NULLS LAST, c.id ASC
        """,
        countQuery = """
        SELECT count(c.id) FROM credit c
        LEFT JOIN client cl ON cl.id = c.client_id
        WHERE c.status = 'INPROGRESS'
          AND (
               CAST(c.expected_end_date AS DATE) < CURRENT_DATE
               OR
               (c.daily_stake > 0 AND c.total_amount_paid < (c.daily_stake * get_days_between_dates(CAST(c.begin_date AS DATE), CAST(LEAST(CURRENT_DATE, c.expected_end_date) AS DATE))))
          )
          AND (
               :search = ''
               OR translate(lower(coalesce(cl.firstname, '') || ' ' || coalesce(cl.lastname, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(cl.quarter, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(c.collector, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR lower(coalesce(c.reference, '')) LIKE '%' || :search || '%'
               OR (:digits <> '' AND regexp_replace(coalesce(cl.phone, ''), '\\D', '', 'g') LIKE '%' || :digits || '%')
          )
        """,
        nativeQuery = true)
    Page<Credit> searchLateCredits(@Param("search") String search, @Param("digits") String digits, Pageable pageable);

    @Query(value = """
        SELECT c.* FROM credit c
        WHERE c.status = 'INPROGRESS'
          AND c.collector = :collector
    """, nativeQuery = true)
    List<Credit> findInProgressCreditsByCollector(@Param("collector") String collector);

    /**
     * Page of in-progress credits for the recovery-manager field list.
     * {@code search} and {@code digits} are already folded (lowercase, no accents). Empty string means no filter.
     */
    @Query(value = """
        SELECT c.* FROM credit c
        LEFT JOIN client cl ON cl.id = c.client_id
        WHERE c.status = 'INPROGRESS'
          AND (
               :search = ''
               OR translate(lower(coalesce(cl.firstname, '') || ' ' || coalesce(cl.lastname, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(cl.quarter, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(c.collector, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR lower(coalesce(c.reference, '')) LIKE '%' || :search || '%'
               OR (:digits <> '' AND regexp_replace(coalesce(cl.phone, ''), '\\D', '', 'g') LIKE '%' || :digits || '%')
          )
        """ + RmFieldListProgressSql.CREDIT_NATIVE + """
        ORDER BY cl.lastname ASC NULLS LAST, cl.firstname ASC NULLS LAST, c.id ASC
        """,
        countQuery = """
        SELECT count(c.id) FROM credit c
        LEFT JOIN client cl ON cl.id = c.client_id
        WHERE c.status = 'INPROGRESS'
          AND (
               :search = ''
               OR translate(lower(coalesce(cl.firstname, '') || ' ' || coalesce(cl.lastname, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(cl.quarter, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR translate(lower(coalesce(c.collector, '')),
                    'àâäéèêëïîôùûüç', 'aaaeeeeiioouuuc') LIKE '%' || :search || '%'
               OR lower(coalesce(c.reference, '')) LIKE '%' || :search || '%'
               OR (:digits <> '' AND regexp_replace(coalesce(cl.phone, ''), '\\D', '', 'g') LIKE '%' || :digits || '%')
          )
        """ + RmFieldListProgressSql.CREDIT_NATIVE,
        nativeQuery = true)
    Page<Credit> searchInProgressCredits(
            @Param("search") String search,
            @Param("digits") String digits,
            @Param("progress") String progress,
            Pageable pageable);

    @Query(value = """
        SELECT DISTINCT c.collector FROM credit c 
        WHERE c.status = 'INPROGRESS'
          AND c.collector IS NOT NULL
          AND (
               CAST(c.expected_end_date AS DATE) < CURRENT_DATE
               OR 
               (c.daily_stake > 0 AND c.total_amount_paid < (c.daily_stake * get_days_between_dates(CAST(c.begin_date AS DATE), CAST(LEAST(CURRENT_DATE, c.expected_end_date) AS DATE))))
          )
    """, nativeQuery = true)
    List<String> findLateCreditsCollectors();

    // ==========================================
    // CRÉDITS À ÉCHÉANCE
    // ==========================================

    @Query("""
        SELECT c FROM Credit c
        LEFT JOIN FETCH c.client
        WHERE c.status IN :statuses
        AND c.expectedEndDate BETWEEN :from AND :to
        ORDER BY c.expectedEndDate ASC
    """)
    List<Credit> findActiveByEndDateBetween(
            @Param("statuses") List<CreditStatus> statuses,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
        SELECT c FROM Credit c
        LEFT JOIN FETCH c.client
        WHERE c.status IN :statuses
        AND c.expectedEndDate BETWEEN :from AND :to
        AND c.collector = :collector
        ORDER BY c.expectedEndDate ASC
    """)
    List<Credit> findActiveByEndDateBetweenAndCollector(
            @Param("statuses") List<CreditStatus> statuses,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("collector") String collector);

    // ==========================================
    // RESTE CHEZ LES CLIENTS & PORTEFEUILLE LIVE
    // ==========================================

    @Query(
            value = """
                    SELECT new com.optimize.elykia.sale.web.dto.RemainingAtClientsCreditDto(
                        c.id, c.reference, cl.lastname, cl.firstname,
                        c.beginDate, c.totalAmount, c.totalAmountRemaining)
                    FROM Credit c
                    JOIN c.client cl
                    WHERE c.collector = :collector
                      AND c.type = :type
                      AND c.state = :state
                      AND c.beginDate BETWEEN :startDate AND :endDate
                      AND c.totalAmountRemaining > 0
                    ORDER BY c.beginDate DESC, c.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(c.id)
                    FROM Credit c
                    WHERE c.collector = :collector
                      AND c.type = :type
                      AND c.state = :state
                      AND c.beginDate BETWEEN :startDate AND :endDate
                      AND c.totalAmountRemaining > 0
                    """
    )
    Page<RemainingAtClientsCreditDto> findRemainingAtClientsCredits(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    @Query("""
            SELECT new com.optimize.elykia.sale.web.dto.RemainingAtClientsCreditDto(
                c.id, c.reference, cl.lastname, cl.firstname,
                c.beginDate, c.totalAmount, c.totalAmountRemaining)
            FROM Credit c
            JOIN c.client cl
            WHERE c.collector = :collector
              AND c.type = :type
              AND c.state = :state
              AND c.beginDate BETWEEN :startDate AND :endDate
              AND c.totalAmountRemaining > 0
            ORDER BY c.beginDate DESC, c.id DESC
            """)
    List<RemainingAtClientsCreditDto> findAllRemainingAtClientsCredits(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("""
            SELECT COUNT(c.id), COALESCE(SUM(c.totalAmountRemaining), 0)
            FROM Credit c
            WHERE c.collector = :collector
              AND c.type = :type
              AND c.state = :state
              AND c.beginDate BETWEEN :startDate AND :endDate
              AND c.totalAmountRemaining > 0
            """)
    List<Object[]> sumRemainingAtClients(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("""
            SELECT COALESCE(SUM(c.totalAmountPaid), 0)
            FROM Credit c
            WHERE c.collector = :collector
              AND c.type = :type
              AND c.state = :state
              AND c.beginDate BETWEEN :startDate AND :endDate
            """)
    Double sumTotalAmountPaidForYear(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("""
            SELECT COALESCE(SUM(c.totalAmountPaid), 0)
            FROM Credit c
            WHERE c.collector = :collector
              AND c.type = :type
              AND c.state = :state
            """)
    Double sumTotalAmountPaidForCollector(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state);

    @Query(
            value = """
                    SELECT new com.optimize.elykia.sale.web.dto.RemainingAtClientsCreditDto(
                        c.id, c.reference, cl.lastname, cl.firstname,
                        c.beginDate, c.totalAmount, c.totalAmountRemaining)
                    FROM Credit c
                    JOIN c.client cl
                    WHERE c.collector = :collector
                      AND c.type = :type
                      AND c.state = :state
                      AND c.totalAmountRemaining > 0
                    ORDER BY c.beginDate DESC, c.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(c.id)
                    FROM Credit c
                    WHERE c.collector = :collector
                      AND c.type = :type
                      AND c.state = :state
                      AND c.totalAmountRemaining > 0
                    """
    )
    Page<RemainingAtClientsCreditDto> findLiveRemainingAtClientsCredits(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state,
            Pageable pageable);

    @Query("""
            SELECT new com.optimize.elykia.sale.web.dto.RemainingAtClientsCreditDto(
                c.id, c.reference, cl.lastname, cl.firstname,
                c.beginDate, c.totalAmount, c.totalAmountRemaining)
            FROM Credit c
            JOIN c.client cl
            WHERE c.collector = :collector
              AND c.type = :type
              AND c.state = :state
              AND c.totalAmountRemaining > 0
            ORDER BY c.beginDate DESC, c.id DESC
            """)
    List<RemainingAtClientsCreditDto> findAllLiveRemainingAtClientsCredits(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state);

    @Query("""
            SELECT COUNT(c.id), COALESCE(SUM(c.totalAmountRemaining), 0)
            FROM Credit c
            WHERE c.collector = :collector
              AND c.type = :type
              AND c.state = :state
              AND c.totalAmountRemaining > 0
            """)
    List<Object[]> sumLiveRemainingAtClients(
            @Param("collector") String collector,
            @Param("type") OperationType type,
            @Param("state") State state);

    @Query(value = """
            WITH eligible AS (
                SELECT c.id,
                       c.collector,
                       c.total_amount,
                       COALESCE(c.advance, 0) AS advance
                FROM credit c
                WHERE c.visibility = 'ENABLED'
                  AND c.type = 'CREDIT'
                  AND c.begin_date < CAST(:asOfDate AS date)
            ),
            holder AS (
                SELECT e.id,
                       COALESCE(
                           (
                               SELECT h.new_collector
                               FROM credit_collector_history h
                               WHERE h.credit_id = e.id
                                 AND h.visibility = 'ENABLED'
                                 AND h.change_date < CAST(:asOfDateTime AS timestamp)
                               ORDER BY h.change_date DESC, h.id DESC
                               LIMIT 1
                           ),
                           COALESCE(
                               (
                                   SELECT h.old_collector
                                   FROM credit_collector_history h
                                   WHERE h.credit_id = e.id
                                     AND h.visibility = 'ENABLED'
                                     AND h.change_date >= CAST(:asOfDateTime AS timestamp)
                                   ORDER BY h.change_date ASC, h.id ASC
                                   LIMIT 1
                               ),
                               e.collector
                           )
                       ) AS holder_collector
                FROM eligible e
            ),
            paid AS (
                SELECT e.id,
                       e.advance + COALESCE((
                           SELECT SUM(ct.amount)
                           FROM credit_timeline ct
                           INNER JOIN daily_accountancy da ON da.id = ct.daily_accountancy_id
                           WHERE ct.credit_id = e.id
                             AND ct.visibility = 'ENABLED'
                             AND CAST(da.accounting_date AS date) < CAST(:asOfDate AS date)
                       ), 0) AS paid_before
                FROM eligible e
            )
            SELECT COALESCE(SUM(GREATEST(0, e.total_amount - p.paid_before)), 0)
            FROM eligible e
            INNER JOIN holder h ON h.id = e.id
            INNER JOIN paid p ON p.id = e.id
            WHERE UPPER(h.holder_collector) = UPPER(CAST(:collector AS text))
            """, nativeQuery = true)
    Double sumOpeningStockAtDate(
            @Param("collector") String collector,
            @Param("asOfDate") LocalDate asOfDate,
            @Param("asOfDateTime") LocalDateTime asOfDateTime);

    @Query("""
            SELECT COUNT(c) FROM Credit c
            WHERE c.state = com.optimize.common.entities.enums.State.ENABLED
              AND c.status = com.optimize.elykia.sale.domain.CreditStatus.INPROGRESS
              AND (:commercial IS NULL OR LOWER(c.collector) = LOWER(:commercial))
            """)
    long countEnabledInProgress(@Param("commercial") String commercial);

    @Query("""
            SELECT COUNT(c) FROM Credit c
            WHERE c.state = com.optimize.common.entities.enums.State.ENABLED
              AND c.carnetVerified = true
              AND c.carnetVerifiedBy IS NOT NULL
              AND LOWER(c.carnetVerifiedBy) = LOWER(:observer)
              AND c.carnetVerifiedAt >= :startAt
              AND c.carnetVerifiedAt < :endAt
              AND (:commercial IS NULL OR LOWER(c.collector) = LOWER(:commercial))
            """)
    long countCarnetVerifiedByObserver(
            @Param("observer") String observer,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt,
            @Param("commercial") String commercial);
}
