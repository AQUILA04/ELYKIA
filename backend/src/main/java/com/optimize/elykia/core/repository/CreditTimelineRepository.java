package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.CreditTimelineMobileDto;
import com.optimize.elykia.core.dto.CreditTimelineRespDto;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.QueryHint;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

public interface CreditTimelineRepository extends GenericRepository<CreditTimeline, Long> {

    Page<CreditTimeline> findByCollectorAndCreatedDateBetween(String collector, LocalDateTime dateFrom, LocalDateTime dateTo, Pageable pageable);


    Page<CreditTimeline> findByCreatedDateBetween(LocalDateTime dateFrom, LocalDateTime dateTo, Pageable pageable);

    Stream<CreditTimeline> findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(LocalDateTime dateFrom, LocalDateTime dateTo);
    Stream<CreditTimeline> findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(String collector, LocalDateTime dateFrom, LocalDateTime dateTo);

    default Double sumAmountByCreatedDateBetween(LocalDateTime dateFrom, LocalDateTime dateTo) {
        return findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqualAndState(dateFrom, dateTo,
                com.optimize.common.entities.enums.State.ENABLED)
                .mapToDouble(CreditTimeline::getAmount).sum();
    }

    Stream<CreditTimeline> findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqualAndState(
            LocalDateTime dateFrom, LocalDateTime dateTo, com.optimize.common.entities.enums.State state);

    Stream<CreditTimeline> findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqualAndState(
            String collector, LocalDateTime dateFrom, LocalDateTime dateTo,
            com.optimize.common.entities.enums.State state);

    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query(value = "select sum(amount) from credit_timeline ct join daily_accountancy da on ct.daily_accountancy_id=da.id where ct.collector = :collector and cast(da.accounting_date as date) >= cast(:dateFrom as date) and cast(da.accounting_date as date) <= cast(:dateTo as date)", nativeQuery = true)
    Double sumAmountByCollectorAndDate(@Param(value = "collector") String collector, @Param(value = "dateFrom") LocalDateTime dateFrom, @Param(value = "dateTo") LocalDateTime dateTo);

    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query(value = "select sum(ct.amount) from credit_timeline ct join daily_accountancy da on ct.daily_accountancy_id=da.id where  cast(da.accounting_date as date) >= cast(:dateFrom as date) and cast(da.accounting_date as date) <= cast(:dateTo as date)", nativeQuery = true)
    Double sumAmountByDate( @Param(value = "dateFrom") LocalDateTime dateFrom, @Param(value = "dateTo") LocalDateTime dateTo);

    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query(value = "select sum(ct.amount) from credit_timeline ct join credit c on ct.credit_id = c.id join daily_accountancy da on ct.daily_accountancy_id=da.id where cast(da.date_reg as date) >= cast(:dateFrom as date) and cast(da.date_reg as date) <= cast(:dateTo as date) and c.type = :type", nativeQuery = true)
    Double sumAmountByDateAndCreditType(@Param(value = "dateFrom") LocalDateTime dateFrom, @Param(value = "dateTo") LocalDateTime dateTo, @Param("type") String type);

    @Query(value = "select sum(amount) from credit_timeline where daily_accountancy_id = :dailyAccountancyId", nativeQuery = true)
    double sumAmountByDailyAccountancyId(@Param(value = "dailyAccountancyId") Long dailyAccountancyId);

    default Double sumAmountByCollectorAndCreatedDateBetween(String collector, LocalDateTime dateFrom, LocalDateTime dateTo) {
        return findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqualAndState(collector, dateFrom, dateTo,
                com.optimize.common.entities.enums.State.ENABLED)
                .mapToDouble(CreditTimeline::getAmount).sum();
    }

    List<CreditTimeline> findByCredit_id(Long creditId);

    List<CreditTimeline> findByCredit_idAndState(Long creditId, com.optimize.common.entities.enums.State state);

    Page<CreditTimeline> findByCredit_id(Long creditId, Pageable pageable);

    Page<CreditTimeline> findByCredit_idAndState(Long creditId, com.optimize.common.entities.enums.State state, Pageable pageable);

    @Query("SELECT ct FROM CreditTimeline ct JOIN FETCH ct.credit c LEFT JOIN FETCH c.client WHERE ct.id = :id")
    Optional<CreditTimeline> findByIdWithCreditAndClient(@Param("id") Long id);

    @Query("SELECT new com.optimize.elykia.core.dto.CreditTimelineRespDto(" +
            "ct.id, ct.reference, ct.amount, ct.normalStake, ct.remainingDaysCount, ct.totalAmountRemaining, " +
            "ct.collector, ct.createdDate, ct.operationConsentCode, ct.confirmedAmount, ct.syncConsentCode, c.id) " +
            "FROM CreditTimeline ct " +
            "LEFT JOIN ct.credit c " +
            "WHERE c.id = :creditId " +
            "AND ct.state = :state")
    List<CreditTimelineRespDto> findRespDtosByCreditIdAndState(
            @Param("creditId") Long creditId,
            @Param("state") com.optimize.common.entities.enums.State state);

    @Query("SELECT new com.optimize.elykia.core.dto.CreditTimelineRespDto(" +
            "ct.id, ct.reference, ct.amount, ct.normalStake, ct.remainingDaysCount, ct.totalAmountRemaining, " +
            "ct.collector, ct.createdDate, ct.operationConsentCode, ct.confirmedAmount, ct.syncConsentCode, c.id) " +
            "FROM CreditTimeline ct " +
            "LEFT JOIN ct.credit c " +
            "WHERE c.id = :creditId " +
            "AND ct.state = :state")
    Page<CreditTimelineRespDto> findRespDtosByCreditIdAndState(
            @Param("creditId") Long creditId,
            @Param("state") com.optimize.common.entities.enums.State state,
            Pageable pageable);

    boolean existsByReference(String reference);

    Optional<CreditTimeline> findByReference(String reference);

    Page<CreditTimeline> findByCredit_Client_Id(Long clientId, Pageable pageable);

    @Query("SELECT new com.optimize.elykia.core.dto.CreditTimelineMobileDto(" +
            "ct.id, ct.amount, ct.createdDate, ct.normalStake, ct.collector, " +
            "c.id, cl.id, ct.reference, ct.operationConsentCode, ct.confirmedAmount, ct.syncConsentCode) " +
            "FROM CreditTimeline ct " +
            "LEFT JOIN ct.credit c " +
            "LEFT JOIN c.client cl " +
            "WHERE ct.collector = :collector " +
            "AND ct.state = com.optimize.common.entities.enums.State.ENABLED " +
            "AND ct.createdDate >= :dateFrom " +
            "AND ct.createdDate <= :dateTo")
    List<CreditTimelineMobileDto> findMobileDtosByCollectorAndDateRange(
            @Param("collector") String collector,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo);

    @Query("SELECT new com.optimize.elykia.core.dto.RecouvrementWebDto(" +
            "ct.id, ct.reference, c.reference, CONCAT(cl.firstname, ' ', cl.lastname), ct.collector, " +
            "ct.amount, ct.totalAmountRemaining, ct.createdDate, ct.operationConsentCode, ct.confirmedAmount, ct.syncConsentCode) " +
            "FROM CreditTimeline ct " +
            "LEFT JOIN ct.credit c " +
            "LEFT JOIN c.client cl " +
            "WHERE ct.state = com.optimize.common.entities.enums.State.ENABLED " +
            "AND ct.createdDate >= :dateFrom " +
            "AND ct.createdDate <= :dateTo")
    Page<com.optimize.elykia.core.dto.RecouvrementWebDto> findWebDtosByDateRange(
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable);

    @Query("SELECT new com.optimize.elykia.core.dto.RecouvrementWebDto(" +
            "ct.id, ct.reference, c.reference, CONCAT(cl.firstname, ' ', cl.lastname), ct.collector, " +
            "ct.amount, ct.totalAmountRemaining, ct.createdDate, ct.operationConsentCode, ct.confirmedAmount, ct.syncConsentCode) " +
            "FROM CreditTimeline ct " +
            "LEFT JOIN ct.credit c " +
            "LEFT JOIN c.client cl " +
            "WHERE ct.collector = :collector " +
            "AND ct.state = com.optimize.common.entities.enums.State.ENABLED " +
            "AND ct.createdDate >= :dateFrom " +
            "AND ct.createdDate <= :dateTo")
    Page<com.optimize.elykia.core.dto.RecouvrementWebDto> findWebDtosByCollectorAndDateRange(
            @Param("collector") String collector,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable);
}
