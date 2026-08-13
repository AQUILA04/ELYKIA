package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.CashDeposit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CashDepositRepository extends GenericRepository<CashDeposit, Long> {
    Page<CashDeposit> findByDateAndCommercialUsername(LocalDate date, String commercialUsername, Pageable pageable);

    Page<CashDeposit> findByDateBetweenAndCommercialUsername(LocalDate startDate, LocalDate endDate,
            String commercialUsername, Pageable pageable);

    Page<CashDeposit> findByDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    boolean existsByReference(String reference);

    Optional<CashDeposit> findByReference(String reference);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(COALESCE(cd.creditAmount, cd.amount)), 0)
            FROM CashDeposit cd
            WHERE cd.commercialUsername = :collector
              AND cd.date >= :start
              AND cd.date <= :end
              AND cd.amount > 0
            """)
    double sumCreditDepositsForPeriod(
            @org.springframework.data.repository.query.Param("collector") String collector,
            @org.springframework.data.repository.query.Param("start") LocalDate start,
            @org.springframework.data.repository.query.Param("end") LocalDate end);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(cd.amount), 0),
                   COALESCE(SUM(COALESCE(cd.creditAmount, cd.amount)), 0),
                   COALESCE(SUM(COALESCE(cd.tontineAmount, 0)), 0),
                   COALESCE(SUM(COALESCE(cd.newBalanceAmount, 0)), 0)
            FROM CashDeposit cd
            WHERE cd.date >= :start
              AND cd.date <= :end
              AND cd.amount > 0
            """)
    java.util.List<Object[]> sumDepositsByPeriod(
            @org.springframework.data.repository.query.Param("start") LocalDate start,
            @org.springframework.data.repository.query.Param("end") LocalDate end);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(cd.amount), 0),
                   COALESCE(SUM(COALESCE(cd.creditAmount, cd.amount)), 0),
                   COALESCE(SUM(COALESCE(cd.tontineAmount, 0)), 0),
                   COALESCE(SUM(COALESCE(cd.newBalanceAmount, 0)), 0)
            FROM CashDeposit cd
            WHERE cd.date >= :start
              AND cd.date <= :end
              AND cd.amount > 0
              AND cd.remittance IS NULL
            """)
    java.util.List<Object[]> sumUnremittedDepositsByPeriod(
            @org.springframework.data.repository.query.Param("start") LocalDate start,
            @org.springframework.data.repository.query.Param("end") LocalDate end);

    @org.springframework.data.jpa.repository.Query("""
            SELECT cd FROM CashDeposit cd
            WHERE cd.date >= :start
              AND cd.date <= :end
              AND cd.amount > 0
              AND cd.remittance IS NULL
            """)
    List<CashDeposit> findUnremittedDepositsByPeriod(
            @org.springframework.data.repository.query.Param("start") LocalDate start,
            @org.springframework.data.repository.query.Param("end") LocalDate end);

    @org.springframework.data.jpa.repository.Query("""
            SELECT cd FROM CashDeposit cd
            JOIN FETCH cd.remittance r
            WHERE r.id IN :remittanceIds
            ORDER BY r.id ASC, cd.commercialUsername ASC, cd.date ASC, cd.id ASC
            """)
    List<CashDeposit> findByRemittanceIdInOrderByRemittanceIdAscCommercialUsernameAscDateAscIdAsc(
            @org.springframework.data.repository.query.Param("remittanceIds") Collection<Long> remittanceIds);
}
