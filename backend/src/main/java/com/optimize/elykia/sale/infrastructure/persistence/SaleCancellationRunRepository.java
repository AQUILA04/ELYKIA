package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.SaleCancellationRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface SaleCancellationRunRepository extends GenericRepository<SaleCancellationRun, Long> {

    Page<SaleCancellationRun> findAllByOrderByCreatedDateDesc(Pageable pageable);

    Page<SaleCancellationRun> findByCommercialUsernameOrderByCreatedDateDesc(String commercialUsername, Pageable pageable);

    Page<SaleCancellationRun> findByStartDateGreaterThanEqualAndEndDateLessThanEqualOrderByCreatedDateDesc(
            LocalDate startDate, LocalDate endDate, Pageable pageable);

    /**
     * Historique filtrable : commercial, chevauchement de la période ciblée, recherche texte.
     * Les paramètres null / vides sont ignorés.
     */
    @Query("""
            SELECT r FROM SaleCancellationRun r
            WHERE (:commercialUsername IS NULL OR :commercialUsername = ''
                   OR LOWER(r.commercialUsername) = LOWER(:commercialUsername))
              AND (:startDate IS NULL OR r.endDate >= :startDate)
              AND (:endDate IS NULL OR r.startDate <= :endDate)
              AND (
                   :search IS NULL OR :search = ''
                   OR LOWER(r.commercialUsername) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(r.triggeredBy) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(r.cancellationReason) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(CAST(r.status AS string)) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR CONCAT('', r.id) LIKE CONCAT('%', :search, '%')
              )
            ORDER BY r.createdDate DESC
            """)
    Page<SaleCancellationRun> searchRuns(
            @Param("commercialUsername") String commercialUsername,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("search") String search,
            Pageable pageable);
}
