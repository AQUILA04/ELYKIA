package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.InventoryReconciliation;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryReconciliationRepository extends GenericRepository<InventoryReconciliation, Long> {

    @Query("SELECT ir FROM InventoryReconciliation ir WHERE ir.inventoryItem.id = :inventoryItemId ORDER BY ir.performedAt DESC")
    List<InventoryReconciliation> findByInventoryItemIdOrderByPerformedAtDesc(@Param("inventoryItemId") Long inventoryItemId);
}

