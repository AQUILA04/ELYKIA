package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.SolvencyStatus;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static com.optimize.common.entities.repository.spec.BaseSpecifications.from;

public interface CreditRepository extends GenericRepository<Credit, Long> {

    @Query(value = "SELECT new com.optimize.elykia.core.dto.DownloadData(a.name as name, ca.quantity as quantity, a.creditSalePrice as creditSalePrice, (a.creditSalePrice * ca.quantity) as totalPrice) " +
            "FROM Credit c INNER JOIN CreditArticles ca ON c.id = ca.credit.id " +
            "INNER JOIN Articles a ON a.id = ca.articles.id " +
            "WHERE c.beginDate = :currentDate AND c.status = 'INPROGRESS' AND c.clientType = :clientType AND c.collector = :collector ")
    List<DownloadData> getDownloadDataByCollector(@Param(value = "currentDate") LocalDate currentDate, @Param(value = "collector") String collector, ClientType clientType);

    @Query(value = "SELECT new com.optimize.elykia.core.dto.DownloadData(a.name as name, ca.quantity as quantity, a.creditSalePrice as creditSalePrice, (a.creditSalePrice * ca.quantity) as totalPrice) " +
            "FROM Credit c INNER JOIN CreditArticles ca ON c.id = ca.credit.id " +
            "INNER JOIN Articles a ON a.id = ca.articles.id " +
            "WHERE c.releaseDate = :currentDate AND c.clientType = :clientType")
    List<DownloadData> getReleaseDownloadData(@Param(value = "currentDate") LocalDate currentDate, ClientType clientType);

    @Query(value = "SELECT distinct c.collector FROM Credit c WHERE c.beginDate = :currentDate and c.clientType = :clientType")
    List<String> getCollectorWhoReleaseItemCurrentDate(@Param(value = "currentDate") LocalDate currentDate, ClientType clientType);

    @Query(value = "SELECT distinct c.collector FROM Credit c WHERE c.releaseDate = :releaseDate and c.clientType = :clientType")
    List<String> getCollectorWhoReleaseItemByReleaseDate(@Param(value = "releaseDate") LocalDate releaseDate, ClientType clientType);

    Page<Credit> findByStatusOrderByIdDesc(CreditStatus status, Pageable pageable);

    Page<Credit> findByOrderByIdDesc(Pageable pageable);

    Page<Credit> findByCollectorAndState(String collector, State state, Pageable pageable);

    Page<Credit> findByStatus(CreditStatus status, Pageable pageable);

    Page<Credit> findByStatusAndClientTypeAndCollector(CreditStatus status, ClientType clientType, String collector, Pageable pageable);

    Page<Credit> findByStatusInAndClientType(List<CreditStatus> status, ClientType clientType, Pageable pageable);

    Page<Credit> findByRemainingDaysCountLessThanEqual(Integer daysCount, Pageable pageable);
    // AJOUTEZ CETTE LIGNE si elle n'existe pas déjà
    Page<Credit> findByState(State state, Pageable pageable);

    Optional<Credit> findByClient_idAndCollectorAndStatus(Long clientId, String collector, CreditStatus status);

    Optional<Credit> findByIdAndStatus(Long creditId, CreditStatus status);

    List<Credit> findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc
            (CreditStatus status, String username, ClientType clientType);

    @Query(value = "UPDATE Credit c SET c.dailyPaid = false WHERE c.status = 'INPROGRESS'")
    @Modifying
    void updateDailyPaidForCredit();

    @Query(value = "UPDATE Credit c SET c.releasePrinted = true WHERE c.releaseDate = :releaseDate")
    @Modifying
    void updateReleasePrinted(LocalDate releaseDate);

    @Query(value = "SELECT DISTINCT c.releaseDate FROM Credit c WHERE c.releasePrinted = false")
    List<LocalDate> getAllNotPrintedReleaseDate();

    Page<Credit> findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(CreditStatus status, String username, ClientType clientType, Pageable pageable);

    default Page<Credit> elasticsearch(String keyword, Pageable pageable) {
        return findAll(getElasticsearchCriteria(keyword), pageable);
    }

    @Query("SELECT SUM(c.totalAmount) FROM Credit c WHERE c.beginDate >= :dateFrom AND c.beginDate <= :dateTo AND c.status IN :statuses AND c.state = :state AND c.clientType = :clientType")
    Double sumTotalAmountByBeginDateBetweenAndStatusInAndState(
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo,
            @Param("statuses") List<CreditStatus> statuses,
            @Param("state") State state,
            @Param("clientType") ClientType clientType


    );


    @Query(value = "SELECT sum (total_amount) FROM Credit WHERE begin_date >= cast(:dateFrom as date) AND begin_date <= cast(:dateTo as date) AND status in (:statusList) AND (client_type= 'PROMOTER' OR (client_type= 'CLIENT' AND parent_id IS NULL)) ", nativeQuery = true)
    Double sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqual(@Param(value = "dateFrom") LocalDate dateFrom, @Param(value = "dateTo") LocalDate dateTo, @Param(value = "statusList") List<String> satusList);

    @Query(value = "SELECT sum (total_amount) FROM Credit WHERE begin_date >= cast(:dateFrom as date) AND begin_date <= cast(:dateTo as date) AND collector = :collector AND status in (:statusList)  ", nativeQuery = true)
    Double sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqualAndCollector(@Param(value = "dateFrom") LocalDate dateFrom, @Param(value = "dateTo") LocalDate dateTo, @Param(value = "collector") String collector, @Param(value = "statusList") List<String> satusList);

    @Query(value = "SELECT sum (ca.quantity) " +
            "FROM credit parent INNER JOIN credit details ON parent.id = details.parent_id " +
            "JOIN credit_articles ca ON ca.credit_id = details.id " +
            "WHERE ca.articles_id = :articleId AND parent.id = :creditId ", nativeQuery = true)
    Integer sumTotalArticleDistributedForParentCredit(@Param(value = "articleId") Long articleId, @Param(value = "creditId") Long creditId);


    // #################### MÉTHODE CORRIGÉE ####################
    default Specification<Credit> getElasticsearchCriteria(String keyword) {
        // CORRECTION 1 : La vérification isNumeric se fait sur le 'keyword' original
        boolean isNumeric = StringUtils.isNumeric(keyword);
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());

        return (root, query, cb) -> {
            // La recherche sur les champs texte
            jakarta.persistence.criteria.Predicate p = cb.or(
                    cb.like(cb.lower(from(root, "client.firstname")), searchKeyword),
                    cb.like(cb.lower(from(root, "client.lastname")), searchKeyword),
                    cb.like(cb.lower(root.get("type").as(String.class)), searchKeyword), // Robuste pour les Enums
                    cb.like(cb.lower(root.get("collector")), searchKeyword),
                    cb.like(cb.lower(root.get("reference")), searchKeyword),
                    cb.like(cb.lower(root.get("status").as(String.class)), searchKeyword), // Robuste pour les Enums
                    cb.like(cb.lower(root.get("solvencyNote").as(String.class)), searchKeyword)
            );

            // La logique pour les nombres est maintenant correcte
            if (isNumeric) {
                // CORRECTION 2 : On réassigne le résultat de cb.or() à p
                p = cb.or(p, cb.equal(root.get("remainingDaysCount"), Integer.valueOf(keyword)));
                p = cb.or(p, cb.equal(root.get("dailyStake"), Double.valueOf(keyword)));
                p = cb.or(p, cb.equal(root.get("totalAmount"), Double.valueOf(keyword)));
            }

            // On s'assure de toujours exclure les éléments supprimés
            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }
    // ###########################################################
    @Query(value = "SELECT count(*) From Credit c where c.client.id = :clientId AND c.status in :status AND c.state= :state")
    Integer countByClient_idAndStatusAndVisibility(Long clientId, List<CreditStatus> status, State state);
    default boolean hasCreditInProgress(Long clientId){
        return countByClient_idAndStatusAndVisibility(clientId, List.of(CreditStatus.INPROGRESS, CreditStatus.CREATED, CreditStatus.VALIDATED), State.ENABLED)>0;
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
              AND collector = :commercial
              AND (
                (c.clientType = :promoterType)
                OR
                (c.clientType = :clientType AND c.parent.id IS NULL )
              )
            """)
    Double getTotalInProgressAmountByCommercial(String commercial, ClientType clientType,ClientType promoterType, CreditStatus status, State state);
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
    Double getTotalInProgressRemainingAmountByCommercial(String commercial, ClientType clientType,ClientType promoterType, CreditStatus status, State state);
    @Query(value = "SELECT sum(c.totalAmountPaid) FROM Credit c WHERE c.collector = :commercial and c.clientType = :clientType and c.status = :status")
    Double getTotalInProgressAmountPaidByCommercial(String commercial, ClientType clientType, CreditStatus status);

    @Query(value = "SELECT sum(c.daily_stake * get_days_between_dates(cast(c.begin_date as date), cast(c.expected_end_date as date))) FROM credit c WHERE c.collector = :commercial and c.client_type = 'CLIENT' and c.status = 'INPROGRESS'", nativeQuery = true)
    Double getTotalAmountDueTodayByCommercial(String commercial);


    Page<Credit> findByUpdatableFalseAndClientTypeAndCollector(ClientType clientType, String collector, Pageable pageable);

    List<Credit> findByParent_id(Long parentId);
    Page<Credit> findByParent_id(Long parentId, Pageable pageable);

    @Query(value = """
            SELECT new com.optimize.elykia.core.dto.CreditRespDto(c.id, c.client.id, c.beginDate, c.expectedEndDate,
            c.effectiveEndDate, c.solvencyNote, c.lateDaysCount, c.totalAmount, c.totalPurchase, c.totalAmountPaid,
            c.totalAmountRemaining, c.dailyStake, c.status, c.remainingDaysCount, c.collector, c.type, c.dailyPaid, c.clientType,
            c.parent.id, c.updatable, c.reference, c.accountingDate, c.releaseDate, c.releasePrinted, c.oldReference, NULL, NULL)
            FROM Credit c
            WHERE c.status = :creditStatus AND c.collector = :collector AND c.clientType = :clientType
    """)
    Page<CreditRespDto> findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(CreditStatus creditStatus, String collector, ClientType clientType, Pageable pageable);

    Page<Credit> findByStatusInAndCollectorAndClientTypeOrderByClient_quarterAsc(List<CreditStatus> creditStatus, String collector, ClientType clientType, Pageable pageable);

    @Query(value = "SELECT count(*) FROM Credit c WHERE c.client.id = :clientId and c.status = :status")
    Integer countCreditsByClientId(Long clientId, CreditStatus status);
    //Total avances
    @Query("SELECT SUM(c.advance) FROM Credit c WHERE c.collector = :commercial AND c.clientType = :clientType AND c.status = :status")
    Double getTotalAdvanceByCommercial(String commercial, ClientType clientType, CreditStatus status
    );
    // total totalAmount
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
    
    @Query(value = "SELECT sum(((c.daily_stake * get_days_between_dates(cast(c.begin_date as date), cast(c.expected_end_date as date))) + c.advance)) FROM credit c WHERE c.client_id = :clientId and c.status = 'INPROGRESS'", nativeQuery = true)
    Double getTotalAmountDueTodayByClientId(Long clientId);
    
    Integer countByStatusAndClient_idAndSolvencyNote(CreditStatus status, Long clientId, SolvencyStatus solvencyStatus);
    
    Integer countByStatusAndClient_id(CreditStatus status, Long clientId);

    Page<Credit> findByClient_idAndStatus(Long clientId, CreditStatus status, Pageable pageable);
    
    Page<Credit> findByClient_idAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable);

    Page<Credit> findByCollectorAndClientTypeAndStatusInOrderByIdDesc(
    String collector, 
    ClientType clientType, 
    List<CreditStatus> statuses, 
    Pageable pageable);

    Page<Credit> findByClientTypeAndStatusAndBeginDateBefore(
    ClientType clientType, 
    CreditStatus status, 
    LocalDate date,
    Pageable pageable
    );

    @Query(value = "SELECT c.* FROM Credit c WHERE c.status = 'INPROGRESS' AND ((get_days_between_dates(c.begin_date, c.expected_end_date) * c.daily_stake) > c.total_amount_paid) AND c.client_type = 'CLIENT' AND c.collector = :collector", nativeQuery = true)
    Page<Credit> getDelayedCredits(String collector, Pageable pageable);

    @Query(value = "SELECT c.* FROM Credit c WHERE c.status = 'INPROGRESS' AND ((30 - get_days_between_dates(c.begin_date, c.expected_end_date)) < 7  ) AND c.client_type = 'CLIENT' AND c.collector = :collector", nativeQuery = true)
    Page<Credit> getEndingCredits(String collector, Pageable pageable);

    @Query(value = "SELECT sum(total_amount_paid) as total_amount_paid, sum(total_amount_remaining) as total_amount_remaining FROM credit WHERE parent_id = :creditId and status = 'INPROGRESS'", nativeQuery = true)
    PromoterCreditTotalAmountPaid getPromoterCreditTotalAmountPaidAndTotalAmountRemaining(Long creditId);

    @Query("""
        SELECT new com.optimize.elykia.core.dto.StockOutput(
            c.id, c.reference, c.status, c.updatable,
            c.totalAmount, c.beginDate, c.collector, NULL)
        FROM Credit c
        WHERE c.parent.id IS NULL
            AND c.clientType = 'PROMOTER'
            AND c.status = 'INPROGRESS'
            AND c.state = 'ENABLED'
            AND c.collector = :commercialUsername
        ORDER BY c.beginDate DESC
        """)
    List<StockOutput> findActiveCommercialCredits(@Param("commercialUsername") String commercialUsername);

    @Query("""
        SELECT new com.optimize.elykia.core.dto.StockOutputItem(ca.id, c.id, art.id, CAST((ca.quantity - COALESCE((
                SELECT SUM(caChild.quantity)
                FROM CreditArticles caChild
                JOIN caChild.credit child
                WHERE child.parent.id = c.id
                    AND child.state = 'ENABLED'
                    AND child.status = 'INPROGRESS'
                    AND caChild.state = 'ENABLED'
                    AND caChild.articles.id = art.id), 0)) AS integer), art.creditSalePrice)
        FROM CreditArticles ca
        JOIN ca.credit c
        JOIN ca.articles art
        WHERE c.id = :creditId
            AND c.parent.id IS NULL
            AND c.clientType = 'PROMOTER'
            AND c.status = 'INPROGRESS'
            AND c.state = 'ENABLED'
            AND ca.state = 'ENABLED'
            AND art.state = 'ENABLED'
            AND (ca.quantity - COALESCE((
                SELECT SUM(caChild.quantity)
                FROM CreditArticles caChild
                JOIN caChild.credit child
                WHERE child.parent.id = c.id
                    AND child.state = 'ENABLED'
                    AND child.status = 'INPROGRESS'
                    AND caChild.state = 'ENABLED'
                    AND caChild.articles.id = art.id ), 0)) > 0 ORDER BY ca.id
        """)
    List<StockOutputItem> findStockOutputItemsByCreditId(@Param("creditId") Long creditId);

    Optional<Credit> findByCollectorAndClientTypeAndStatusAndState(String collector,ClientType clientType, CreditStatus status, State state);

    boolean existsByCollectorAndClientTypeAndStatusAndState(String collector, ClientType clientType, CreditStatus status, State state);

    // Nouvelles méthodes pour la fusion des crédits
    List<Credit> findByCollectorAndClientTypeAndStatusAndUpdatableAndState(
        String collector, ClientType clientType, CreditStatus status, Boolean updatable, State state);

    List<Credit> findByIdInAndCollectorAndClientTypeAndUpdatableAndState(
        List<Long> ids, String collector, ClientType clientType, Boolean updatable, State state);

    // ===== MÉTHODES POUR BI DASHBOARD =====
    List<Credit> findByAccountingDateBetweenAndClientType(LocalDate startDate, LocalDate endDate, ClientType clientType);
    List<Credit> findByAccountingDateBetweenAndTypeAndClientType(LocalDate startDate, LocalDate endDate, OperationType type, ClientType clientType);
    
    List<Credit> findByAccountingDate(LocalDate date);
    
    List<Credit> findByStatusAndClientType(CreditStatus status, ClientType clientType);
    List<Credit> findByStatusAndTypeAndClientType(CreditStatus status, com.optimize.elykia.core.enumaration.OperationType type, ClientType clientType);
    
    List<Credit> findByCollectorAndAccountingDateBetweenAndClientType(String collector, LocalDate startDate, LocalDate endDate, ClientType clientType);
    
    List<Credit> findByCollectorAndStatusAndClientType(String collector, CreditStatus status, ClientType clientType);
    
    @Query("SELECT DISTINCT c.collector FROM Credit c WHERE c.state = 'ENABLED'")
    List<String> findDistinctCollectors();

    boolean existsByTypeAndCollectorAndStatusInAndBeginDateBetween(OperationType type, String commercial, List<CreditStatus> statusList, LocalDate startDate, LocalDate endDate);

    boolean existsByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(OperationType type, String commercial, CreditStatus status, ClientType clientType, LocalDate startDate, LocalDate endDate);

    Optional<Credit> findByTypeAndCollectorAndStatusInAndClientTypeAndBeginDateBetween(OperationType type, String commercial, List<CreditStatus> statusList, ClientType clientType, LocalDate startDate, LocalDate endDate);
    Optional<Credit> findByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(OperationType type, String commercial, CreditStatus status, ClientType clientType, LocalDate startDate, LocalDate endDate);

    // ===== OPTIMIZED NATIVE QUERY METHODS FOR BI PERFORMANCE =====
    
    /**
     * Get aggregated sales metrics for a date range
     * Optimized to prevent OutOfMemoryException by doing aggregation in database
     */
    @Query(value = """
        SELECT 
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.date_reg BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    com.optimize.elykia.core.dto.bi.SalesMetricsProjection getSalesMetrics(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get sales trends grouped by date
     * Returns daily aggregations ordered by date
     */
    @Query(value = """
        SELECT 
            c.date_reg as date,
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount
        FROM credit c
        WHERE c.accounting_date BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY c.date_reg
        ORDER BY c.date_reg
        """, nativeQuery = true)
    java.util.List<com.optimize.elykia.core.dto.bi.SalesTrendProjection> getSalesTrends(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get sales performance by commercial
     * Groups sales metrics by collector and orders by total amount descending
     */
    @Query(value = """
        SELECT 
            c.collector,
            COUNT(c.id) as salesCount,
            COALESCE(SUM(c.total_amount), 0) as totalAmount,
            COALESCE(SUM(c.total_amount - c.total_purchase), 0) as totalProfit,
            COALESCE(AVG(c.total_amount), 0) as avgAmount,
            COALESCE(SUM(c.total_amount_paid), 0) as totalCollected
        FROM credit c
        WHERE c.date_reg BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY c.collector
        ORDER BY totalAmount DESC
        """, nativeQuery = true)
    java.util.List<com.optimize.elykia.core.dto.bi.CommercialSalesProjection> getSalesByCommercial(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get portfolio metrics with single query
     * Calculates all portfolio metrics including PAR in one database query
     */
    @Query(value = """
        SELECT 
            COUNT(CASE WHEN c.status = 'INPROGRESS' THEN 1 END) as activeCount,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' THEN c.total_amount_remaining ELSE 0 END), 0) as totalOutstanding,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE THEN c.total_amount_remaining ELSE 0 END), 0) as totalOverdue,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE - INTERVAL '7 days' THEN c.total_amount_remaining ELSE 0 END), 0) as par7,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE - INTERVAL '15 days' THEN c.total_amount_remaining ELSE 0 END), 0) as par15,
            COALESCE(SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE - INTERVAL '30 days' THEN c.total_amount_remaining ELSE 0 END), 0) as par30
        FROM credit c
        WHERE c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    com.optimize.elykia.core.dto.bi.PortfolioMetricsProjection getPortfolioMetrics();
    
    /**
     * Get overdue analysis by date ranges
     * Groups overdue credits into 4 ranges: 0-7, 8-15, 16-30, >30 days
     */
    @Query(value = """
        SELECT 
            CASE 
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 0 AND 7 THEN '0-7 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 8 AND 15 THEN '8-15 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 16 AND 30 THEN '16-30 jours'
                ELSE '>30 jours'
            END as range,
            COUNT(c.id) as creditsCount,
            COALESCE(SUM(c.total_amount_remaining), 0) as totalAmount
        FROM credit c
        WHERE c.status = 'INPROGRESS'
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        AND c.expected_end_date < CURRENT_DATE
        GROUP BY 
            CASE 
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 0 AND 7 THEN '0-7 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 8 AND 15 THEN '8-15 jours'
                WHEN (CURRENT_DATE - c.expected_end_date) BETWEEN 16 AND 30 THEN '16-30 jours'
                ELSE '>30 jours'
            END
        ORDER BY 
            MIN(CURRENT_DATE - c.expected_end_date)
        """, nativeQuery = true)
    java.util.List<com.optimize.elykia.core.dto.bi.OverdueRangeProjection> getOverdueAnalysis();
    
    /**
     * Get article performance with JOIN aggregation
     * Joins articles, credit_articles, and credit tables to calculate performance metrics
     */
    @Query(value = """
        SELECT 
            a.id as articleId,
            CONCAT(a.type, ': ', a.marque, ' ', a.model) as articleName,
            a.category,
            COALESCE(SUM(ca.quantity), 0) as quantitySold,
            COALESCE(SUM(ca.quantity * ca.unit_price), 0) as totalRevenue,
            COALESCE(SUM(ca.quantity * (ca.unit_price - a.purchase_price)), 0) as totalProfit,
            a.stock_turnover_rate as turnoverRate,
            a.stock_quantity as stockQuantity
        FROM articles a
        LEFT JOIN credit_articles ca ON ca.articles_id = a.id
        LEFT JOIN credit c ON ca.credit_id = c.id
        WHERE c.date_reg BETWEEN :startDate AND :endDate
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        GROUP BY a.id, a.type, a.marque, a.model, a.category, a.stock_turnover_rate, a.stock_quantity
        HAVING SUM(ca.quantity) > 0
        ORDER BY totalRevenue DESC
        """, nativeQuery = true)
    java.util.List<com.optimize.elykia.core.dto.bi.ArticlePerformanceProjection> getArticlePerformance(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get total expected amount for active credits
     * Optimized to prevent OutOfMemoryException by doing aggregation in database
     */
    @Query(value = """
        SELECT 
            COALESCE(SUM(c.total_amount), 0) as totalExpected
        FROM credit c
        WHERE c.status = 'INPROGRESS'
        AND c.type = 'CREDIT'
        AND c.client_type = 'CLIENT'
        """, nativeQuery = true)
    Double getTotalExpectedAmountForActiveCredits();
    
    /**
     * Find all credits by type and client type for migration purposes
     */
    List<Credit> findByTypeAndClientType(OperationType type, ClientType clientType);

    boolean existsByReference(String reference);
    Optional<Credit> findByReference(String reference);

    @Query(""" 
           SELECT new com.optimize.elykia.core.dto.CreditRespDto(
               c.id, c.client.id, c.beginDate, c.expectedEndDate, c.effectiveEndDate, c.solvencyNote,
               c.lateDaysCount, c.totalAmount, c.totalPurchase, c.totalAmountPaid,
               c.totalAmountRemaining, c.dailyStake, c.status, c.remainingDaysCount, c.collector,
               c.type, c.dailyPaid, c.clientType, c.parent.id, c.updatable, c.reference,
               c.accountingDate, c.releaseDate, c.releasePrinted, c.oldReference,
               null,
               new com.optimize.elykia.client.dto.ClientRespDto(cl.id, cl.firstname, cl.lastname, cl.address, cl.phone, cl.cardID, cl.cardType, cl.dateOfBirth, null, null, null, cl.collector, cl.quarter, cl.creditInProgress, cl.occupation, cl.clientType, null, null, null, null, cl.code, cl.profilPhotoUrl, cl.cardPhotoUrl, cl.tontineCollector, cl.createdDate))
           FROM Credit c
           LEFT JOIN c.client cl
           WHERE c.state = :state
               AND (:collector IS NULL OR c.collector = :collector)
               AND (:status IS NULL OR c.status = :status)
               AND c.type = :type
           """)
    Page<CreditRespDto> findCreditsDto(
            @Param("collector") String collector,
            @Param("status") CreditStatus status,
            @Param("type") OperationType type,
            @Param("state") State state,
            Pageable pageable);

    @Query(""" 
           SELECT new com.optimize.elykia.core.dto.CreditRespDto(
               c.id, c.client.id, c.beginDate, c.expectedEndDate, c.effectiveEndDate, c.solvencyNote,
               c.lateDaysCount, c.totalAmount, c.totalPurchase, c.totalAmountPaid,
               c.totalAmountRemaining, c.dailyStake, c.status, c.remainingDaysCount, c.collector,
               c.type, c.dailyPaid, c.clientType, c.parent.id, c.updatable, c.reference,
               c.accountingDate, c.releaseDate, c.releasePrinted, c.oldReference,
               null,
               new com.optimize.elykia.client.dto.ClientRespDto(cl.id, cl.firstname, cl.lastname, cl.address, cl.phone, cl.cardID, cl.cardType, cl.dateOfBirth, null, null, null, cl.collector, cl.quarter, cl.creditInProgress, cl.occupation, cl.clientType, null, null, null, null, cl.code, cl.profilPhotoUrl, cl.cardPhotoUrl, cl.tontineCollector, cl.createdDate))
           FROM Credit c
           LEFT JOIN c.client cl
           WHERE c.state = :state
               AND (:collector IS NULL OR c.collector = :collector)
               AND (:status IS NULL OR c.status = :status)
               AND c.type = :type
               AND (:searchTerm IS NULL OR (
                   LOWER(c.reference) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   LOWER(cl.firstname) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   LOWER(cl.lastname) LIKE LOWER(CONCAT('%', :searchTerm, '%'))))
           """)
    Page<CreditRespDto> findCreditsDtoWithSearch(
            @Param("searchTerm") String searchTerm,
            @Param("collector") String collector,
            @Param("status") CreditStatus status,
            @Param("type") OperationType type,
            @Param("state") State state,
            Pageable pageable);

    @Modifying
    @Query("UPDATE Credit c SET c.collector = :newCollector WHERE c.id IN :creditIds")
    int bulkUpdateCollector(@Param("creditIds") List<Long> creditIds, @Param("newCollector") String newCollector);

    @Modifying
    @Query("UPDATE Client cl SET cl.recoveryCollector = :newCollector WHERE cl.id IN (SELECT c.client.id FROM Credit c WHERE c.id IN :creditIds)")
    void bulkUpdateClientRecoveryCollector(@Param("creditIds") List<Long> creditIds, @Param("newCollector") String newCollector);



}
