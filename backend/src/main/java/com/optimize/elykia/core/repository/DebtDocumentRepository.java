package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.enumaration.DebtPeriodGrain;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DebtDocumentRepository extends JpaRepository<DebtDocument, Long> {

    boolean existsByReference(String reference);

    @Query("""
            SELECT d FROM DebtDocument d
            LEFT JOIN FETCH d.lines
            WHERE d.id = :id
            """)
    Optional<DebtDocument> findByIdWithLines(@Param("id") Long id);

    @Query("""
            SELECT d FROM DebtDocument d
            WHERE d.holderUsername = :holder
              AND d.debtType = :type
              AND d.periodGrain = :grain
              AND d.periodYear = :year
              AND (:month IS NULL OR d.periodMonth = :month)
              AND (:day IS NULL OR d.periodDay = :day)
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            """)
    Optional<DebtDocument> findActiveByPeriod(
            @Param("holder") String holder,
            @Param("type") DebtType type,
            @Param("grain") DebtPeriodGrain grain,
            @Param("year") Integer year,
            @Param("month") Integer month,
            @Param("day") LocalDate day);

    Optional<DebtDocument> findByMonthlyStockIdAndDebtTypeAndStatusNot(
            Long monthlyStockId, DebtType debtType, DebtStatus status);

    Optional<DebtDocument> findByInventoryIdAndDebtTypeAndStatusNot(
            Long inventoryId, DebtType debtType, DebtStatus status);

    @Query("""
            SELECT d FROM DebtDocument d
            WHERE (:holder IS NULL OR d.holderUsername = :holder)
              AND (:type IS NULL OR d.debtType = :type)
              AND (:status IS NULL OR d.status = :status)
              AND (:year IS NULL OR d.periodYear = :year)
              AND (:month IS NULL OR d.periodMonth = :month)
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            ORDER BY d.periodYear DESC, d.periodMonth DESC NULLS LAST, d.periodDay DESC NULLS LAST, d.id DESC
            """)
    Page<DebtDocument> search(
            @Param("holder") String holder,
            @Param("type") DebtType type,
            @Param("status") DebtStatus status,
            @Param("year") Integer year,
            @Param("month") Integer month,
            Pageable pageable);

    @Query("""
            SELECT d FROM DebtDocument d
            WHERE d.holderUsername = :holder
              AND d.debtType = :type
              AND d.status IN :statuses
            ORDER BY d.periodYear ASC, d.periodMonth ASC NULLS LAST, d.periodDay ASC NULLS LAST, d.id ASC
            """)
    List<DebtDocument> findOpenByHolderAndType(
            @Param("holder") String holder,
            @Param("type") DebtType type,
            @Param("statuses") Collection<DebtStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(d.grossAmount), 0), COALESCE(SUM(d.paidAmount + d.offsetAmount), 0)
            FROM DebtDocument d
            WHERE d.holderUsername = :holder
              AND d.debtType = com.optimize.elykia.core.enumaration.DebtType.MERCHANDISE
              AND d.periodYear = :year
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            """)
    List<Object[]> sumMerchandiseYearlyTotals(
            @Param("holder") String holder,
            @Param("year") int year);

    @Query("""
            SELECT COALESCE(SUM(d.remainingAmount), 0)
            FROM DebtDocument d
            WHERE d.debtType <> com.optimize.elykia.core.enumaration.DebtType.CASH_SURPLUS
              AND d.status IN (
                com.optimize.elykia.core.enumaration.DebtStatus.OPEN,
                com.optimize.elykia.core.enumaration.DebtStatus.PARTIALLY_SETTLED)
            """)
    double sumOpenDebtRemaining();

    @Query("""
            SELECT COALESCE(SUM(d.remainingAmount), 0)
            FROM DebtDocument d
            WHERE d.debtType = com.optimize.elykia.core.enumaration.DebtType.CASH_SURPLUS
              AND d.status IN (
                com.optimize.elykia.core.enumaration.DebtStatus.OPEN,
                com.optimize.elykia.core.enumaration.DebtStatus.PARTIALLY_SETTLED)
            """)
    double sumOpenSurplusRemaining();

    @Query("""
            SELECT d.debtType, COALESCE(SUM(d.remainingAmount), 0)
            FROM DebtDocument d
            WHERE d.status IN (
                com.optimize.elykia.core.enumaration.DebtStatus.OPEN,
                com.optimize.elykia.core.enumaration.DebtStatus.PARTIALLY_SETTLED)
            GROUP BY d.debtType
            """)
    List<Object[]> sumRemainingByType();

    @Query("""
            SELECT COUNT(d) > 0 FROM DebtDocument d
            WHERE d.monthlyStock.id = :stockId
              AND d.debtType = com.optimize.elykia.core.enumaration.DebtType.MERCHANDISE
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            """)
    boolean existsActiveMerchandiseForStock(@Param("stockId") Long stockId);

    @Query("""
            SELECT d FROM DebtDocument d
            WHERE d.holderUsername = :holder
              AND d.debtType IN (
                com.optimize.elykia.core.enumaration.DebtType.CASH_SHORTAGE,
                com.optimize.elykia.core.enumaration.DebtType.CASH_SURPLUS)
              AND d.periodGrain = com.optimize.elykia.core.enumaration.DebtPeriodGrain.MONTH
              AND d.periodYear = :year
              AND d.periodMonth = :month
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            """)
    Optional<DebtDocument> findActiveCashMonth(
            @Param("holder") String holder,
            @Param("year") int year,
            @Param("month") int month);

    @Query("""
            SELECT d FROM DebtDocument d
            WHERE d.holderUsername = :holder
              AND d.debtType IN (
                com.optimize.elykia.core.enumaration.DebtType.CASH_SHORTAGE,
                com.optimize.elykia.core.enumaration.DebtType.CASH_SURPLUS)
              AND d.periodGrain = com.optimize.elykia.core.enumaration.DebtPeriodGrain.DAY
              AND d.periodDay = :day
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            """)
    Optional<DebtDocument> findActiveCashDay(
            @Param("holder") String holder,
            @Param("day") LocalDate day);

    @Query("""
            SELECT d.periodDay FROM DebtDocument d
            WHERE d.holderUsername = :holder
              AND d.debtType IN (
                com.optimize.elykia.core.enumaration.DebtType.CASH_SHORTAGE,
                com.optimize.elykia.core.enumaration.DebtType.CASH_SURPLUS)
              AND d.periodGrain = com.optimize.elykia.core.enumaration.DebtPeriodGrain.DAY
              AND d.periodYear = :year
              AND d.periodMonth = :month
              AND d.status <> com.optimize.elykia.core.enumaration.DebtStatus.CANCELLED
            """)
    List<LocalDate> findActiveCashDaysInMonth(
            @Param("holder") String holder,
            @Param("year") int year,
            @Param("month") int month);
}
