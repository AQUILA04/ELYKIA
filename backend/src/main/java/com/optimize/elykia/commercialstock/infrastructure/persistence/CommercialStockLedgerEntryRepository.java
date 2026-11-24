package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
import com.optimize.elykia.commercialstock.domain.CommercialStockLedgerEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CommercialStockLedgerEntryRepository extends JpaRepository<CommercialStockLedgerEntry, Long> {

    boolean existsByReversesMovementId(Long reversesMovementId);

    /** Somme des deltas strictement avant une date comptable (solde d'ouverture reconstruit depuis le ledger). */
    @Query("select coalesce(sum(m.deltaQuantity), 0) from CommercialStockLedgerEntry m "
            + "where m.positionId = :positionId and m.accountingDate < :date")
    long sumDeltaBefore(@Param("positionId") Long positionId, @Param("date") LocalDate date);

    @Query("select m from CommercialStockLedgerEntry m where m.positionId = :positionId and m.accountingDate >= :date "
            + "order by m.accountingDate asc, m.occurredAt asc, m.id asc")
    List<CommercialStockLedgerEntry> findFromDate(@Param("positionId") Long positionId, @Param("date") LocalDate date);

    /** Sorties d'une position rattachées à une référence métier et pas encore restaurées (les plus récentes d'abord). */
    @Query("select m from CommercialStockLedgerEntry m where m.positionId = :positionId "
            + "and m.referenceType = :referenceType and m.referenceId = :referenceId "
            + "and m.movementType in :types and m.deltaQuantity < 0 "
            + "and not exists (select 1 from CommercialStockLedgerEntry r where r.reversesMovementId = m.id) "
            + "order by m.id desc")
    List<CommercialStockLedgerEntry> findReversibleByReference(@Param("positionId") Long positionId,
                                                               @Param("referenceType") CommercialStockReferenceType referenceType,
                                                               @Param("referenceId") Long referenceId,
                                                               @Param("types") List<CommercialStockMovementType> types);

    @Query("select m from CommercialStockLedgerEntry m where (:collector is null or m.collector = :collector) "
            + "and (:articleId is null or m.articleId = :articleId) "
            + "and (:activityType is null or m.activityType = :activityType) "
            + "and (:movementType is null or m.movementType = :movementType) "
            + "and m.accountingDate >= :startDate and m.accountingDate <= :endDate "
            + "order by m.accountingDate desc, m.id desc")
    List<CommercialStockLedgerEntry> search(@Param("collector") String collector, @Param("articleId") Long articleId,
                                            @Param("activityType") com.optimize.elykia.commercialstock.api.StockActivityType activityType,
                                            @Param("movementType") CommercialStockMovementType movementType,
                                            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate,
                                            Pageable pageable);

    @Query("select m from CommercialStockLedgerEntry m where (:collector is null or m.collector = :collector) "
            + "and (:activityType is null or m.activityType = :activityType) "
            + "and m.accountingDate <= :endDate order by m.collector, m.articleId, m.activityType")
    List<CommercialStockLedgerEntry> findAllUpTo(@Param("collector") String collector,
                                                 @Param("activityType") com.optimize.elykia.commercialstock.api.StockActivityType activityType,
                                                 @Param("endDate") LocalDate endDate);
}
