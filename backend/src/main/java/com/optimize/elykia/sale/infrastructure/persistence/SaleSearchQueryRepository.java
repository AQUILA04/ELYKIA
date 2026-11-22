package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.sale.web.dto.DownloadData;
import com.optimize.elykia.sale.web.dto.StockOutput;
import com.optimize.elykia.sale.web.dto.StockOutputItem;
import com.optimize.elykia.shared.domain.OperationType;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

import static com.optimize.common.entities.repository.spec.BaseSpecifications.from;

/**
 * Requêtes lecture seule de recherche multi-critères, projections de listes, sorties de stock,
 * historique client/commercial et exports portés sur {@link Credit}.
 */
public interface SaleSearchQueryRepository extends Repository<Credit, Long>, JpaSpecificationExecutor<Credit> {

    @Query(value = "SELECT new com.optimize.elykia.sale.web.dto.DownloadData(a.name as name, ca.quantity as quantity, a.creditSalePrice as creditSalePrice, (a.creditSalePrice * ca.quantity) as totalPrice) " +
            "FROM Credit c INNER JOIN CreditArticles ca ON c.id = ca.credit.id " +
            "INNER JOIN Articles a ON a.id = ca.articles.id " +
            "WHERE c.beginDate = :currentDate AND c.status = 'INPROGRESS' AND c.clientType = :clientType AND c.collector = :collector ")
    List<DownloadData> getDownloadDataByCollector(@Param(value = "currentDate") LocalDate currentDate, @Param(value = "collector") String collector, ClientType clientType);

    @Query(value = "SELECT new com.optimize.elykia.sale.web.dto.DownloadData(a.name as name, ca.quantity as quantity, a.creditSalePrice as creditSalePrice, (a.creditSalePrice * ca.quantity) as totalPrice) " +
            "FROM Credit c INNER JOIN CreditArticles ca ON c.id = ca.credit.id " +
            "INNER JOIN Articles a ON a.id = ca.articles.id " +
            "WHERE c.releaseDate = :currentDate AND c.clientType = :clientType")
    List<DownloadData> getReleaseDownloadData(@Param(value = "currentDate") LocalDate currentDate, ClientType clientType);

    @Query(value = "SELECT distinct c.collector FROM Credit c WHERE c.beginDate = :currentDate and c.clientType = :clientType")
    List<String> getCollectorWhoReleaseItemCurrentDate(@Param(value = "currentDate") LocalDate currentDate, ClientType clientType);

    @Query(value = "SELECT distinct c.collector FROM Credit c WHERE c.releaseDate = :releaseDate and c.clientType = :clientType")
    List<String> getCollectorWhoReleaseItemByReleaseDate(@Param(value = "releaseDate") LocalDate releaseDate, ClientType clientType);

    @Query(value = "SELECT DISTINCT c.releaseDate FROM Credit c WHERE c.releasePrinted = false")
    List<LocalDate> getAllNotPrintedReleaseDate();

    Page<Credit> findByStatusOrderByIdDesc(CreditStatus status, Pageable pageable);

    Page<Credit> findByOrderByIdDesc(Pageable pageable);

    Page<Credit> findByCollectorAndState(String collector, State state, Pageable pageable);

    Page<Credit> findByStatus(CreditStatus status, Pageable pageable);

    Page<Credit> findByStatusAndClientTypeAndCollector(CreditStatus status, ClientType clientType, String collector, Pageable pageable);

    Page<Credit> findByStatusInAndClientType(List<CreditStatus> status, ClientType clientType, Pageable pageable);

    Page<Credit> findByRemainingDaysCountLessThanEqual(Integer daysCount, Pageable pageable);

    Page<Credit> findByState(State state, Pageable pageable);

    Page<Credit> findByUpdatableFalseAndClientTypeAndCollector(ClientType clientType, String collector, Pageable pageable);

    Page<Credit> findByClient_idAndStatus(Long clientId, CreditStatus status, Pageable pageable);

    Page<Credit> findByClient_idAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable);

    List<Credit> findByClient_IdAndTypeOrderByBeginDateDesc(Long clientId, OperationType type);

    Page<Credit> findByCollectorAndClientTypeAndStatusInOrderByIdDesc(
            String collector,
            ClientType clientType,
            List<CreditStatus> statuses,
            Pageable pageable);

    Page<Credit> findByClientTypeAndStatusAndBeginDateBefore(
            ClientType clientType,
            CreditStatus status,
            LocalDate date,
            Pageable pageable);

    default Page<Credit> elasticsearch(String keyword, Pageable pageable) {
        return findAll(getElasticsearchCriteria(keyword), pageable);
    }

    default Specification<Credit> getElasticsearchCriteria(String keyword) {
        boolean isNumeric = StringUtils.isNumeric(keyword);
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());

        return (root, query, cb) -> {
            jakarta.persistence.criteria.Predicate p = cb.or(
                    cb.like(cb.lower(from(root, "client.firstname")), searchKeyword),
                    cb.like(cb.lower(from(root, "client.lastname")), searchKeyword),
                    cb.like(cb.lower(root.get("type").as(String.class)), searchKeyword),
                    cb.like(cb.lower(root.get("collector")), searchKeyword),
                    cb.like(cb.lower(root.get("reference")), searchKeyword),
                    cb.like(cb.lower(root.get("status").as(String.class)), searchKeyword),
                    cb.like(cb.lower(root.get("solvencyNote").as(String.class)), searchKeyword)
            );

            if (isNumeric) {
                p = cb.or(p, cb.equal(root.get("remainingDaysCount"), Integer.valueOf(keyword)));
                p = cb.or(p, cb.equal(root.get("dailyStake"), Double.valueOf(keyword)));
                p = cb.or(p, cb.equal(root.get("totalAmount"), Double.valueOf(keyword)));
            }

            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }

    @Query(value = """
            SELECT new com.optimize.elykia.sale.web.dto.CreditRespDto(c.id, c.client.id, c.beginDate, c.expectedEndDate,
            c.effectiveEndDate, c.solvencyNote, c.lateDaysCount, c.totalAmount, c.totalPurchase, c.totalAmountPaid,
            c.totalAmountRemaining, c.advance, c.dailyStake, c.status, c.remainingDaysCount, c.collector, c.type, c.dailyPaid, c.clientType,
            c.parent.id, c.updatable, c.reference, c.accountingDate, c.releaseDate, c.releasePrinted, c.oldReference, NULL, NULL,
            c.operationConsentCode, c.confirmedAmount, c.syncConsentCode,
            c.carnetVerified, c.carnetVerifiedAt, c.carnetVerifiedBy,
            c.pendingWarehouseDelivery)
            FROM Credit c
            WHERE c.status = :creditStatus AND c.collector = :collector AND c.clientType = :clientType
    """)
    Page<CreditRespDto> findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(
            CreditStatus creditStatus, String collector, ClientType clientType, Pageable pageable);

    Page<Credit> findByStatusInAndCollectorAndClientTypeOrderByClient_quarterAsc(
            List<CreditStatus> creditStatus, String collector, ClientType clientType, Pageable pageable);

    @Query("""
           SELECT new com.optimize.elykia.sale.web.dto.CreditRespDto(
               c.id, c.client.id, c.beginDate, c.expectedEndDate, c.effectiveEndDate, c.solvencyNote,
               c.lateDaysCount, c.totalAmount, c.totalPurchase, c.totalAmountPaid,
               c.totalAmountRemaining, c.advance, c.dailyStake, c.status, c.remainingDaysCount, c.collector,
               c.type, c.dailyPaid, c.clientType, c.parent.id, c.updatable, c.reference,
               c.accountingDate, c.releaseDate, c.releasePrinted, c.oldReference,
               null,
               new com.optimize.elykia.client.dto.ClientRespDto(cl.id, cl.firstname, cl.lastname, cl.address, cl.phone, cl.cardID, cl.cardType, cl.dateOfBirth, null, null, null, cl.collector, cl.quarter, cl.creditInProgress, cl.businessCreditInProgress, cl.businessCreditAuthorized, cl.businessCreditAuthorizedBy, cl.businessCreditAuthorizedAt, cl.occupation, cl.clientType, null, null, null, null, cl.code, cl.profilPhotoUrl, cl.cardPhotoUrl, cl.tontineCollector, cl.createdDate, cl.profilPhotoThumbUrl, cl.cardPhotoThumbUrl, cl.registrationSource),
               c.operationConsentCode, c.confirmedAmount, c.syncConsentCode,
               c.carnetVerified, c.carnetVerifiedAt, c.carnetVerifiedBy,
               c.pendingWarehouseDelivery)
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
           SELECT new com.optimize.elykia.sale.web.dto.CreditRespDto(
               c.id, c.client.id, c.beginDate, c.expectedEndDate, c.effectiveEndDate, c.solvencyNote,
               c.lateDaysCount, c.totalAmount, c.totalPurchase, c.totalAmountPaid,
               c.totalAmountRemaining, c.advance, c.dailyStake, c.status, c.remainingDaysCount, c.collector,
               c.type, c.dailyPaid, c.clientType, c.parent.id, c.updatable, c.reference,
               c.accountingDate, c.releaseDate, c.releasePrinted, c.oldReference,
               null,
               new com.optimize.elykia.client.dto.ClientRespDto(cl.id, cl.firstname, cl.lastname, cl.address, cl.phone, cl.cardID, cl.cardType, cl.dateOfBirth, null, null, null, cl.collector, cl.quarter, cl.creditInProgress, cl.businessCreditInProgress, cl.businessCreditAuthorized, cl.businessCreditAuthorizedBy, cl.businessCreditAuthorizedAt, cl.occupation, cl.clientType, null, null, null, null, cl.code, cl.profilPhotoUrl, cl.cardPhotoUrl, cl.tontineCollector, cl.createdDate, cl.profilPhotoThumbUrl, cl.cardPhotoThumbUrl, cl.registrationSource),
               c.operationConsentCode, c.confirmedAmount, c.syncConsentCode,
               c.carnetVerified, c.carnetVerifiedAt, c.carnetVerifiedBy,
               c.pendingWarehouseDelivery)
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

    @Query("""
        SELECT new com.optimize.elykia.sale.web.dto.StockOutput(
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
        SELECT new com.optimize.elykia.sale.web.dto.StockOutputItem(ca.id, c.id, art.id, CAST((ca.quantity - COALESCE((
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

    @Query(value = """
            SELECT DISTINCT c.id
            FROM Credit cr
            JOIN cr.client c
            WHERE cr.state = com.optimize.common.entities.enums.State.ENABLED
              AND cr.type = com.optimize.elykia.shared.domain.OperationType.CASH
              AND (
                LOWER(cr.agencyCommercial) = LOWER(:commercial)
                OR LOWER(cr.collector) = LOWER(:commercial)
              )
              AND (c.agencyCollector IS NULL OR LOWER(c.agencyCollector) <> LOWER(:commercial))
            ORDER BY c.id DESC
            """,
            countQuery = """
            SELECT COUNT(DISTINCT c.id)
            FROM Credit cr
            JOIN cr.client c
            WHERE cr.state = com.optimize.common.entities.enums.State.ENABLED
              AND cr.type = com.optimize.elykia.shared.domain.OperationType.CASH
              AND (
                LOWER(cr.agencyCommercial) = LOWER(:commercial)
                OR LOWER(cr.collector) = LOWER(:commercial)
              )
              AND (c.agencyCollector IS NULL OR LOWER(c.agencyCollector) <> LOWER(:commercial))
            """)
    Page<Long> findFormerAgencyClientIds(
            @Param("commercial") String commercial,
            Pageable pageable);
}
