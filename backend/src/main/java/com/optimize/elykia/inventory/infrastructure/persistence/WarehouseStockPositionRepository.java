package com.optimize.elykia.inventory.infrastructure.persistence;

import com.optimize.elykia.inventory.domain.WarehouseStockPosition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WarehouseStockPositionRepository extends JpaRepository<WarehouseStockPosition, Long> {

    Optional<WarehouseStockPosition> findByAgencyIdAndArticleId(Long agencyId, Long articleId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM WarehouseStockPosition p WHERE p.agencyId = :agencyId AND p.articleId = :articleId")
    Optional<WarehouseStockPosition> findForUpdate(@Param("agencyId") Long agencyId, @Param("articleId") Long articleId);

    List<WarehouseStockPosition> findByAgencyId(Long agencyId);

    List<WarehouseStockPosition> findByAgencyIdAndArticleIdIn(Long agencyId, Collection<Long> articleIds);

    List<WarehouseStockPosition> findByArticleId(Long articleId);

    @Query("SELECT COALESCE(SUM(p.onHandQuantity), 0) FROM WarehouseStockPosition p WHERE p.articleId = :articleId")
    Integer sumOnHandByArticleId(@Param("articleId") Long articleId);

    @Query("SELECT COALESCE(SUM(p.reservedQuantity), 0) FROM WarehouseStockPosition p WHERE p.articleId = :articleId")
    Integer sumReservedByArticleId(@Param("articleId") Long articleId);
}
