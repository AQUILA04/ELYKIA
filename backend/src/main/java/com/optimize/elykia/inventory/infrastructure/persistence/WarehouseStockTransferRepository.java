package com.optimize.elykia.inventory.infrastructure.persistence;

import com.optimize.elykia.inventory.domain.WarehouseStockTransfer;
import com.optimize.elykia.inventory.domain.WarehouseTransferStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WarehouseStockTransferRepository extends JpaRepository<WarehouseStockTransfer, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM WarehouseStockTransfer t LEFT JOIN FETCH t.items WHERE t.id = :id")
    Optional<WarehouseStockTransfer> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT t FROM WarehouseStockTransfer t LEFT JOIN FETCH t.items WHERE t.id = :id")
    Optional<WarehouseStockTransfer> findByIdWithItems(@Param("id") Long id);

    @Query("""
            SELECT t FROM WarehouseStockTransfer t
            WHERE (:agencyId IS NULL OR t.sourceAgencyId = :agencyId OR t.targetAgencyId = :agencyId)
              AND (:status IS NULL OR t.status = :status)
            ORDER BY t.createdAt DESC, t.id DESC
            """)
    Page<WarehouseStockTransfer> search(
            @Param("agencyId") Long agencyId,
            @Param("status") WarehouseTransferStatus status,
            Pageable pageable);

    @Query("SELECT COALESCE(MAX(t.id), 0) FROM WarehouseStockTransfer t")
    Long findMaxId();
}
