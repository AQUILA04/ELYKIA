package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.dto.StockReceptionListDto;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.enumaration.ReceptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface StockReceptionRepository extends BaseRepository<StockReception, Long, Long> {
    String LIST_PROJECTION = """
            SELECT new com.optimize.elykia.core.dto.StockReceptionListDto(
                sr.id, sr.reference, sr.receptionDate, sr.receivedBy, sr.totalAmount, sr.status)
            FROM StockReception sr
            """;

    String STATUS_FILTER = " WHERE (:status IS NULL OR sr.status = :status)";

    Page<StockReception> findByReceptionDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    Page<StockReception> findByReferenceContainingIgnoreCase(String reference, Pageable pageable);

    Page<StockReception> findByReceptionDate(LocalDate receptionDate, Pageable pageable);

    Page<StockReception> findByReferenceContainingIgnoreCaseAndReceptionDate(String reference, LocalDate receptionDate, Pageable pageable);

    @Query(LIST_PROJECTION + STATUS_FILTER)
    Page<StockReceptionListDto> findAllList(@Param("status") ReceptionStatus status, Pageable pageable);

    @Query(LIST_PROJECTION + STATUS_FILTER + " AND sr.receptionDate BETWEEN :startDate AND :endDate")
    Page<StockReceptionListDto> findListByReceptionDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") ReceptionStatus status,
            Pageable pageable);

    @Query(LIST_PROJECTION + STATUS_FILTER + " AND LOWER(sr.reference) LIKE LOWER(CONCAT('%', :reference, '%'))")
    Page<StockReceptionListDto> findListByReferenceContainingIgnoreCase(
            @Param("reference") String reference,
            @Param("status") ReceptionStatus status,
            Pageable pageable);

    @Query(LIST_PROJECTION + STATUS_FILTER + " AND sr.receptionDate = :receptionDate")
    Page<StockReceptionListDto> findListByReceptionDate(
            @Param("receptionDate") LocalDate receptionDate,
            @Param("status") ReceptionStatus status,
            Pageable pageable);

    @Query(LIST_PROJECTION + STATUS_FILTER + """
             AND LOWER(sr.reference) LIKE LOWER(CONCAT('%', :reference, '%'))
             AND sr.receptionDate = :receptionDate
            """)
    Page<StockReceptionListDto> findListByReferenceContainingIgnoreCaseAndReceptionDate(
            @Param("reference") String reference,
            @Param("receptionDate") LocalDate receptionDate,
            @Param("status") ReceptionStatus status,
            Pageable pageable);

    @Query("SELECT DISTINCT sr FROM StockReception sr " +
            "LEFT JOIN FETCH sr.items i " +
            "LEFT JOIN FETCH i.article " +
            "WHERE sr.id = :id")
    Optional<StockReception> findByIdWithItems(@Param("id") Long id);
}
