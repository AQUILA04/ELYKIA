package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditPurpose;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SolvencyStatus;
import com.optimize.elykia.sale.web.dto.PromoterCreditTotalAmountPaid;
import com.optimize.elykia.shared.domain.OperationType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Dépôt cœur (CRUD, unicité, verrous, mutations bulk et agrégats métier) de l'agrégat {@link Credit}.
 * Les requêtes de recouvrement / retards / échéances sont dans {@link CreditRecoveryQueryRepository} ;
 * les recherches multi-critères et projections de listes sont dans {@link SaleSearchQueryRepository}.
 */
public interface CreditRepository extends GenericRepository<Credit, Long> {

    Optional<Credit> findByClient_idAndCollectorAndStatus(Long clientId, String collector, CreditStatus status);

    Optional<Credit> findByIdAndStatus(Long creditId, CreditStatus status);

    boolean existsByReference(String reference);

    Optional<Credit> findByReference(String reference);

    List<Credit> findByParent_id(Long parentId);

    Page<Credit> findByParent_id(Long parentId, Pageable pageable);

    /**
     * Remet daily_paid à false pour tous les crédits en cours — UPDATE SQL natif,
     * sans charger les entités Credit en mémoire.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE credit
            SET daily_paid = false
            WHERE status = 'INPROGRESS'
              AND COALESCE(daily_paid, false) = true
            """, nativeQuery = true)
    int updateDailyPaidForCredit();

    @Query(value = "UPDATE Credit c SET c.releasePrinted = true WHERE c.releaseDate = :releaseDate")
    @Modifying
    void updateReleasePrinted(LocalDate releaseDate);

    @Query("SELECT SUM(c.totalAmount) FROM Credit c WHERE c.beginDate >= :dateFrom AND c.beginDate <= :dateTo AND c.status IN :statuses AND c.state = :state AND c.clientType = :clientType")
    Double sumTotalAmountByBeginDateBetweenAndStatusInAndState(
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo,
            @Param("statuses") List<CreditStatus> statuses,
            @Param("state") State state,
            @Param("clientType") ClientType clientType);

    @Query(value = "SELECT sum (total_amount) FROM Credit WHERE begin_date >= cast(:dateFrom as date) AND begin_date <= cast(:dateTo as date) AND status in (:statusList) AND (client_type= 'PROMOTER' OR (client_type= 'CLIENT' AND parent_id IS NULL)) ", nativeQuery = true)
    Double sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqual(@Param(value = "dateFrom") LocalDate dateFrom, @Param(value = "dateTo") LocalDate dateTo, @Param(value = "statusList") List<String> satusList);

    @Query(value = "SELECT sum (total_amount) FROM Credit WHERE begin_date >= cast(:dateFrom as date) AND begin_date <= cast(:dateTo as date) AND collector = :collector AND status in (:statusList)  ", nativeQuery = true)
    Double sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqualAndCollector(@Param(value = "dateFrom") LocalDate dateFrom, @Param(value = "dateTo") LocalDate dateTo, @Param(value = "collector") String collector, @Param(value = "statusList") List<String> satusList);

    @Query(value = "SELECT sum (ca.quantity) " +
            "FROM credit parent INNER JOIN credit details ON parent.id = details.parent_id " +
            "JOIN credit_articles ca ON ca.credit_id = details.id " +
            "WHERE ca.articles_id = :articleId AND parent.id = :creditId ", nativeQuery = true)
    Integer sumTotalArticleDistributedForParentCredit(@Param(value = "articleId") Long articleId, @Param(value = "creditId") Long creditId);

    @Query(value = "SELECT count(*) From Credit c where c.client.id = :clientId AND c.status in :status AND c.state= :state")
    Integer countByClient_idAndStatusAndVisibility(Long clientId, List<CreditStatus> status, State state);

    @Query("SELECT count(c) FROM Credit c WHERE c.client.id = :clientId "
            + "AND c.creditPurpose = :purpose AND c.status IN :statuses AND c.state = :state")
    Integer countByClientIdAndPurposeAndStatusIn(
            @Param("clientId") Long clientId,
            @Param("purpose") CreditPurpose purpose,
            @Param("statuses") List<CreditStatus> statuses,
            @Param("state") State state);

    default boolean hasCreditInProgressForPurpose(Long clientId, CreditPurpose purpose) {
        return countByClientIdAndPurposeAndStatusIn(
                clientId,
                purpose,
                List.of(CreditStatus.INPROGRESS, CreditStatus.CREATED, CreditStatus.VALIDATED),
                State.ENABLED) > 0;
    }

    default boolean hasCreditInProgress(Long clientId) {
        return hasCreditInProgressForPurpose(clientId, CreditPurpose.PERSONAL)
                || hasCreditInProgressForPurpose(clientId, CreditPurpose.BUSINESS)
                || hasCreditInProgressForPurpose(clientId, CreditPurpose.EVENT);
    }

    Integer countByStatusAndCollectorAndClientType(CreditStatus status, String commercial, ClientType clientType);

    Integer countByStatusAndCollectorAndClientTypeAndSolvencyNote(CreditStatus status, String commercial, ClientType clientType, SolvencyStatus solvencyStatus);

    @Query(value = "SELECT count(*) FROM Client c where c.collector = :commercial and c.clientType = :clientType")
    Integer getTotalClientByCommercial(String commercial, ClientType clientType);

    @Query(value = """
            SELECT SUM(c.totalAmount)
            FROM Credit c
            WHERE c.status = :status
              AND c.state = :state
              AND c.collector = :commercial
              AND (
                (c.clientType = :promoterType)
                OR
                (c.clientType = :clientType AND c.parent.id IS NULL )
              )
            """)
    Double getTotalInProgressAmountByCommercial(String commercial, ClientType clientType, ClientType promoterType, CreditStatus status, State state);

    @Query(value = """
            SELECT SUM(c.totalAmountRemaining)
            FROM Credit c
            WHERE c.status = :status
              AND c.state = :state
              AND collector = :commercial
              AND (
                (c.clientType = :promoterType)
                OR
                (c.clientType = :clientType AND c.parent.id IS NULL )
              )
            """)
    Double getTotalInProgressRemainingAmountByCommercial(String commercial, ClientType clientType, ClientType promoterType, CreditStatus status, State state);

    @Query(value = "SELECT sum(c.totalAmountPaid) FROM Credit c WHERE c.collector = :commercial and c.clientType = :clientType and c.status = :status")
    Double getTotalInProgressAmountPaidByCommercial(String commercial, ClientType clientType, CreditStatus status);

    @Query(value = "SELECT count(*) FROM Credit c WHERE c.client.id = :clientId and c.status = :status")
    Integer countCreditsByClientId(Long clientId, CreditStatus status);

    @Query("SELECT SUM(c.advance) FROM Credit c WHERE c.collector = :commercial AND c.clientType = :clientType AND c.status = :status")
    Double getTotalAdvanceByCommercial(String commercial, ClientType clientType, CreditStatus status);

    @Query(value = """
                SELECT
                                SUM(
                                    CASE
                                        WHEN client_type = 'PROMOTER' THEN total_amount
                                        WHEN client_type = 'CLIENT' AND parent_id IS NOT NULL THEN -total_amount
                                        ELSE 0
                                    END
                                )
                            FROM
                                credit
                            WHERE
                                collector = :commercial
                                AND visibility = 'ENABLED'
                                AND status NOT IN ('CREATED', 'VALIDATED')
                                AND client_type IN ('PROMOTER', 'CLIENT');
""", nativeQuery = true)
    Double getTotalNotDistributedAmountByCommercial(String commercial);

    @Query(value = "SELECT sum(c.totalAmount) FROM Credit c WHERE c.client.id = :clientId and c.status = :status")
    Double getTotalInProgressAmountByClientId(Long clientId, CreditStatus status);

    @Query(value = "SELECT sum(c.totalAmountPaid) FROM Credit c WHERE c.client.id = :clientId and c.status = :status")
    Double getTotalInProgressAmountPaidByClientId(Long clientId, CreditStatus status);

    Integer countByStatusAndClient_idAndSolvencyNote(CreditStatus status, Long clientId, SolvencyStatus solvencyStatus);

    Integer countByStatusAndClient_id(CreditStatus status, Long clientId);

    @Query(value = "SELECT sum(total_amount_paid) as total_amount_paid, sum(total_amount_remaining) as total_amount_remaining FROM credit WHERE parent_id = :creditId and status = 'INPROGRESS'", nativeQuery = true)
    PromoterCreditTotalAmountPaid getPromoterCreditTotalAmountPaidAndTotalAmountRemaining(Long creditId);

    Optional<Credit> findByCollectorAndClientTypeAndStatusAndState(String collector, ClientType clientType, CreditStatus status, State state);

    boolean existsByCollectorAndClientTypeAndStatusAndState(String collector, ClientType clientType, CreditStatus status, State state);

    List<Credit> findByCollectorAndClientTypeAndStatusAndUpdatableAndState(
            String collector, ClientType clientType, CreditStatus status, Boolean updatable, State state);

    List<Credit> findByIdInAndCollectorAndClientTypeAndUpdatableAndState(
            List<Long> ids, String collector, ClientType clientType, Boolean updatable, State state);

    // ===== MÉTHODES POUR BI DASHBOARD =====
    List<Credit> findByAccountingDateBetweenAndClientType(LocalDate startDate, LocalDate endDate, ClientType clientType);

    List<Credit> findByAccountingDateBetweenAndTypeAndClientType(LocalDate startDate, LocalDate endDate, OperationType type, ClientType clientType);

    List<Credit> findByAccountingDate(LocalDate date);

    List<Credit> findByStatusAndClientType(CreditStatus status, ClientType clientType);

    List<Credit> findByStatusAndTypeAndClientType(CreditStatus status, OperationType type, ClientType clientType);

    List<Credit> findByCollectorAndAccountingDateBetweenAndClientType(String collector, LocalDate startDate, LocalDate endDate, ClientType clientType);

    List<Credit> findByCollectorAndStatusAndClientType(String collector, CreditStatus status, ClientType clientType);

    @Query("SELECT DISTINCT c.collector FROM Credit c WHERE c.state = 'ENABLED'")
    List<String> findDistinctCollectors();

    boolean existsByTypeAndCollectorAndStatusInAndBeginDateBetween(OperationType type, String commercial, List<CreditStatus> statusList, LocalDate startDate, LocalDate endDate);

    boolean existsByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(OperationType type, String commercial, CreditStatus status, ClientType clientType, LocalDate startDate, LocalDate endDate);

    Optional<Credit> findByTypeAndCollectorAndStatusInAndClientTypeAndBeginDateBetween(OperationType type, String commercial, List<CreditStatus> statusList, ClientType clientType, LocalDate startDate, LocalDate endDate);

    Optional<Credit> findByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(OperationType type, String commercial, CreditStatus status, ClientType clientType, LocalDate startDate, LocalDate endDate);

    @Query(value = """
        SELECT COALESCE(SUM(c.daily_stake), 0)
        FROM credit c
        WHERE c.status = 'INPROGRESS'
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    Double sumExpectedDailyCollection();

    @Query(value = """
        SELECT 
            COALESCE(SUM(c.total_amount), 0) as totalExpected
        FROM credit c
        WHERE c.status = 'INPROGRESS'
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    Double getTotalExpectedAmountForActiveCredits();

    List<Credit> findByTypeAndClientType(OperationType type, ClientType clientType);

    @Modifying
    @Query("UPDATE Credit c SET c.collector = :newCollector WHERE c.id IN :creditIds")
    int bulkUpdateCollector(@Param("creditIds") List<Long> creditIds, @Param("newCollector") String newCollector);

    @Modifying
    @Query(value = """
            UPDATE credit SET collector = :newCollector
            WHERE client_id IN :clientIds AND status = 'INPROGRESS' AND collector <> :newCollector
            """, nativeQuery = true)
    int bulkUpdateCollectorForInProgressByClientIds(
            @Param("clientIds") List<Long> clientIds,
            @Param("newCollector") String newCollector);

    @Modifying
    @Query("UPDATE Client cl SET cl.recoveryCollector = :newCollector WHERE cl.id IN (SELECT c.client.id FROM Credit c WHERE c.id IN :creditIds)")
    void bulkUpdateClientRecoveryCollector(@Param("creditIds") List<Long> creditIds, @Param("newCollector") String newCollector);

    @Query("""
            SELECT COALESCE(SUM(c.totalAmount), 0)
            FROM Credit c
            WHERE c.collector = :collector
              AND c.type = com.optimize.elykia.shared.domain.OperationType.CASH
              AND c.state = :state
              AND c.beginDate >= :start
              AND c.beginDate <= :end
            """)
    Double sumCashSalesAmountBetween(
            @Param("collector") String collector,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("state") State state);

    @Query("""
            SELECT c FROM Credit c
            WHERE (c.collector = :collector OR c.agencyCommercial = :collector)
              AND c.state = :state
              AND c.type = :type
              AND c.status IN :statuses
              AND (
                    (
                      (c.reference IS NULL OR c.reference NOT LIKE 'RAT-%')
                      AND c.beginDate >= :startDate AND c.beginDate <= :endDate
                    )
                    OR (
                      c.reference LIKE 'RAT-%'
                      AND c.createdDate >= :registeredFrom
                      AND c.createdDate < :registeredToExclusive
                    )
                  )
            ORDER BY c.beginDate ASC, c.id ASC
            """)
    List<Credit> findSalesForCancellation(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("registeredFrom") LocalDateTime registeredFrom,
            @Param("registeredToExclusive") LocalDateTime registeredToExclusive,
            @Param("type") OperationType type,
            @Param("statuses") Collection<CreditStatus> statuses,
            @Param("state") State state);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM Credit c
            WHERE (c.collector = :collector OR c.agencyCommercial = :collector)
              AND c.state = :state
              AND c.type = :type
              AND c.status IN :statuses
              AND (
                    (
                      (c.reference IS NULL OR c.reference NOT LIKE 'RAT-%')
                      AND c.beginDate >= :startDate AND c.beginDate <= :endDate
                    )
                    OR (
                      c.reference LIKE 'RAT-%'
                      AND c.createdDate >= :registeredFrom
                      AND c.createdDate < :registeredToExclusive
                    )
                  )
            ORDER BY c.beginDate ASC, c.id ASC
            """)
    List<Credit> findSalesForCancellationForUpdate(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("registeredFrom") LocalDateTime registeredFrom,
            @Param("registeredToExclusive") LocalDateTime registeredToExclusive,
            @Param("type") OperationType type,
            @Param("statuses") Collection<CreditStatus> statuses,
            @Param("state") State state);
}
