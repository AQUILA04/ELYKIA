package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.report.CommercialReportMonthly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommercialReportMonthlyRepository extends JpaRepository<CommercialReportMonthly, Long> {

    Optional<CommercialReportMonthly> findByCommercialUsernameAndYearAndMonth(
            String commercialUsername, Integer year, Integer month);

    List<CommercialReportMonthly> findByCommercialUsernameAndYearOrderByMonthAsc(
            String commercialUsername, Integer year);

    @Query("""
            SELECT
                COALESCE(SUM(c.creditSalesAmount), 0),
                COALESCE(SUM(c.creditSalesCount), 0),
                COALESCE(SUM(c.totalCreditAmountDeposited), 0)
            FROM CommercialReportMonthly c
            WHERE c.commercialUsername = :commercialUsername
              AND c.year = :year
            """)
    List<Object[]> sumYearlyTotals(
            @Param("commercialUsername") String commercialUsername,
            @Param("year") Integer year);
}
