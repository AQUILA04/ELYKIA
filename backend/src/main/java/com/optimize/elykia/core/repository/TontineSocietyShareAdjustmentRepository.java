package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.tontine.TontineSocietyShareAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TontineSocietyShareAdjustmentRepository extends JpaRepository<TontineSocietyShareAdjustment, Long> {

    Optional<TontineSocietyShareAdjustment> findFirstByReference(String reference);

    List<TontineSocietyShareAdjustment> findByTontineMemberIdOrderByAdjustedAtDescIdDesc(Long tontineMemberId);

    @Query("""
            SELECT COALESCE(SUM(a.delta), 0) FROM TontineSocietyShareAdjustment a
            WHERE a.adjustedAt >= :dateFrom AND a.adjustedAt <= :dateTo
            """)
    Double sumDeltaByDateRange(@Param("dateFrom") LocalDateTime dateFrom,
                               @Param("dateTo") LocalDateTime dateTo);

    @Query("""
            SELECT COALESCE(SUM(a.delta), 0) FROM TontineSocietyShareAdjustment a
            WHERE a.commercialUsername = :commercial
              AND a.adjustedAt >= :dateFrom AND a.adjustedAt <= :dateTo
            """)
    Double sumDeltaByCommercialAndDateRange(@Param("commercial") String commercial,
                                            @Param("dateFrom") LocalDateTime dateFrom,
                                            @Param("dateTo") LocalDateTime dateTo);

    @Query("""
            SELECT COALESCE(SUM(a.delta), 0) FROM TontineSocietyShareAdjustment a
            WHERE a.tontineSessionId = :sessionId
              AND LOWER(a.commercialUsername) = LOWER(:commercial)
            """)
    Double sumDeltaBySessionAndCommercial(@Param("sessionId") Long sessionId,
                                          @Param("commercial") String commercial);
}
