package com.optimize.elykia.inventory.infrastructure.persistence;

import com.optimize.elykia.inventory.domain.WarehouseReservationStatus;
import com.optimize.elykia.inventory.domain.WarehouseReservationType;
import com.optimize.elykia.inventory.domain.WarehouseStockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface WarehouseStockReservationRepository extends JpaRepository<WarehouseStockReservation, Long> {

    List<WarehouseStockReservation> findByReservationTypeAndReferenceId(
            WarehouseReservationType reservationType,
            Long referenceId);

    List<WarehouseStockReservation> findByAgencyIdAndArticleIdAndStatusInOrderByCreatedAtAscIdAsc(
            Long agencyId,
            Long articleId,
            Collection<WarehouseReservationStatus> statuses);

    List<WarehouseStockReservation> findByAgencyIdAndStatusInOrderByCreatedAtDesc(
            Long agencyId,
            Collection<WarehouseReservationStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(r.shortageQuantity), 0)
            FROM WarehouseStockReservation r
            WHERE r.agencyId = :agencyId
              AND r.articleId = :articleId
              AND r.status IN :statuses
            """)
    Integer sumShortageByAgencyAndArticle(
            @Param("agencyId") Long agencyId,
            @Param("articleId") Long articleId,
            @Param("statuses") Collection<WarehouseReservationStatus> statuses);

    @Query("""
            SELECT r.articleId, COALESCE(SUM(r.shortageQuantity), 0)
            FROM WarehouseStockReservation r
            WHERE r.agencyId = :agencyId
              AND r.status IN :statuses
            GROUP BY r.articleId
            """)
    List<Object[]> sumShortageGroupedByArticle(
            @Param("agencyId") Long agencyId,
            @Param("statuses") Collection<WarehouseReservationStatus> statuses);
}
