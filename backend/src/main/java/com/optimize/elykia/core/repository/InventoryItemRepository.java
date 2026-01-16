package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.InventoryItem;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryItemRepository extends GenericRepository<InventoryItem, Long> {

    List<InventoryItem> findByInventoryId(Long inventoryId);

    List<InventoryItem> findByInventoryIdAndStatus(Long inventoryId, InventoryItemStatus status);

    @Query("SELECT ii FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference != 0")
    List<InventoryItem> findByInventoryIdAndDifferenceNotZero(@Param("inventoryId") Long inventoryId);

    @Query("SELECT ii FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference < 0")
    List<InventoryItem> findByInventoryIdWithDebt(@Param("inventoryId") Long inventoryId);

    @Query("SELECT ii FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference > 0")
    List<InventoryItem> findByInventoryIdWithSurplus(@Param("inventoryId") Long inventoryId);
}

