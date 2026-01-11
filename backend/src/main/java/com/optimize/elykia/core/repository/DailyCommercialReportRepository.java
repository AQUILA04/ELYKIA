package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.entity.DailyCommercialReport;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyCommercialReportRepository extends BaseRepository<DailyCommercialReport, Long, Long> {
        Optional<DailyCommercialReport> findByDateAndCommercialUsername(LocalDate date, String commercialUsername);

        List<DailyCommercialReport> findByCommercialUsernameAndDateBetweenOrderByDateAsc(String commercialUsername,
                        LocalDate startDate, LocalDate endDate);

        @Query("SELECT new com.optimize.elykia.core.entity.DailyCommercialReport(" +
                        "d.commercialUsername, " +
                        "SUM(d.totalStockRequestAmount), " +
                        "SUM(d.creditSalesCount), " +
                        "SUM(d.creditSalesAmount), " +
                        "SUM(d.newClientsCount), " +
                        "SUM(d.newAccountsBalance), " +
                        "SUM(d.collectionsCount), " +
                        "SUM(d.collectionsAmount), " +
                        "SUM(d.ordersCount), " +
                        "SUM(d.ordersAmount), " +
                        "SUM(d.tontineMembersCount), " +
                        "SUM(d.tontineCollectionsCount), " +
                        "SUM(d.tontineCollectionsAmount), " +
                        "SUM(d.tontineDeliveriesCount), " +
                        "SUM(d.tontineDeliveriesAmount)) " +
                        "FROM DailyCommercialReport d " +
                        "WHERE d.date BETWEEN :startDate AND :endDate " +
                        "GROUP BY d.commercialUsername")
        List<DailyCommercialReport> findAggregatedByDateBetween(@Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        @Query("SELECT new com.optimize.elykia.core.entity.DailyCommercialReport(" +
                        "d.commercialUsername, " +
                        "SUM(d.totalStockRequestAmount), " +
                        "SUM(d.creditSalesCount), " +
                        "SUM(d.creditSalesAmount), " +
                        "SUM(d.newClientsCount), " +
                        "SUM(d.newAccountsBalance), " +
                        "SUM(d.collectionsCount), " +
                        "SUM(d.collectionsAmount), " +
                        "SUM(d.ordersCount), " +
                        "SUM(d.ordersAmount), " +
                        "SUM(d.tontineMembersCount), " +
                        "SUM(d.tontineCollectionsCount), " +
                        "SUM(d.tontineCollectionsAmount), " +
                        "SUM(d.tontineDeliveriesCount), " +
                        "SUM(d.tontineDeliveriesAmount)) " +
                        "FROM DailyCommercialReport d " +
                        "WHERE d.commercialUsername = :commercialUsername " +
                        "AND d.date BETWEEN :startDate AND :endDate " +
                        "GROUP BY d.commercialUsername")
        List<DailyCommercialReport> findAggregatedByDateBetweenAndCommercialUsername(
                        @Param("commercialUsername") String commercialUsername,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);
}
