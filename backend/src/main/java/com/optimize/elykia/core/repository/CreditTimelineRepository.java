package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.CreditTimeline;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

public interface CreditTimelineRepository extends GenericRepository<CreditTimeline, Long> {

    Page<CreditTimeline> findByCollectorAndCreatedDateBetween(String collector, LocalDateTime dateFrom, LocalDateTime dateTo, Pageable pageable);


    Page<CreditTimeline> findByCreatedDateBetween(LocalDateTime dateFrom, LocalDateTime dateTo, Pageable pageable);

    Stream<CreditTimeline> findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(LocalDateTime dateFrom, LocalDateTime dateTo);
    Stream<CreditTimeline> findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(String collector, LocalDateTime dateFrom, LocalDateTime dateTo);

    default Double sumAmountByCreatedDateBetween(LocalDateTime dateFrom, LocalDateTime dateTo) {
        return findByCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(dateFrom, dateTo)
                .mapToDouble(CreditTimeline::getAmount).sum();
    }

    @Query(value = "select sum(amount) from credit_timeline ct join daily_accountancy da on ct.daily_accountancy_id=da.id where mod_user_id = :collector and cast(da.accounting_date as date) >= cast(:dateFrom as date) and cast(da.accounting_date as date) <= cast(:dateTo as date)", nativeQuery = true)
    double sumAmountByCollectorAndDate(@Param(value = "collector") String collector, @Param(value = "dateFrom") LocalDateTime dateFrom, @Param(value = "dateTo") LocalDateTime dateTo);

    @Query(value = "select sum(ct.amount) from credit_timeline ct join daily_accountancy da on ct.daily_accountancy_id=da.id where  cast(da.accounting_date as date) >= cast(:dateFrom as date) and cast(da.accounting_date as date) <= cast(:dateTo as date)", nativeQuery = true)
    Double sumAmountByDate( @Param(value = "dateFrom") LocalDateTime dateFrom, @Param(value = "dateTo") LocalDateTime dateTo);

    @Query(value = "select sum(ct.amount) from credit_timeline ct join credit c on ct.credit_id = c.id join daily_accountancy da on ct.daily_accountancy_id=da.id where cast(da.accounting_date as date) >= cast(:dateFrom as date) and cast(da.accounting_date as date) <= cast(:dateTo as date) and c.type = :type", nativeQuery = true)
    Double sumAmountByDateAndCreditType(@Param(value = "dateFrom") LocalDateTime dateFrom, @Param(value = "dateTo") LocalDateTime dateTo, @Param("type") String type);

    @Query(value = "select sum(amount) from credit_timeline where daily_accountancy_id = :dailyAccountancyId", nativeQuery = true)
    double sumAmountByDailyAccountancyId(@Param(value = "dailyAccountancyId") Long dailyAccountancyId);

    default Double sumAmountByCollectorAndCreatedDateBetween(String collector, LocalDateTime dateFrom, LocalDateTime dateTo) {
        return findByCollectorAndCreatedDateGreaterThanEqualAndCreatedDateLessThanEqual(collector, dateFrom, dateTo)
                .mapToDouble(CreditTimeline::getAmount).sum();
    }

    List<CreditTimeline> findByCredit_id(Long creditId);

    Page<CreditTimeline> findByCredit_id(Long creditId, Pageable pageable);
}
