package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends GenericRepository<InventoryItem, Long> {

    List<InventoryItem> findByInventoryId(Long inventoryId);

    List<InventoryItem> findByInventoryIdAndStatus(Long inventoryId, InventoryItemStatus status);

    @Query("SELECT ii FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference != 0")
    List<InventoryItem> findByInventoryIdAndDifferenceNotZero(@Param("inventoryId") Long inventoryId);

    @Query("SELECT ii FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference < 0")
    List<InventoryItem> findByInventoryIdWithDebt(@Param("inventoryId") Long inventoryId);

    @Query("SELECT ii FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference > 0")
    List<InventoryItem> findByInventoryIdWithSurplus(@Param("inventoryId") Long inventoryId);

    @Query("""
            SELECT ii FROM InventoryItem ii
            JOIN FETCH ii.inventory inv
            JOIN FETCH ii.article
            WHERE ii.article.id = :articleId
              AND inv.status IN :statuses
            ORDER BY inv.inventoryDate ASC, inv.id ASC
            """)
    List<InventoryItem> findByArticleIdAndInventoryStatusIn(
            @Param("articleId") Long articleId,
            @Param("statuses") List<InventoryStatus> statuses);

    @Query("""
            SELECT ii FROM InventoryItem ii
            JOIN FETCH ii.inventory
            JOIN FETCH ii.article
            WHERE ii.id = :id
            """)
    Optional<InventoryItem> findByIdWithInventoryAndArticle(@Param("id") Long id);

    Optional<InventoryItem> findByInventoryIdAndArticleId(Long inventoryId, Long articleId);

    long countByInventoryId(Long inventoryId);

    @Query("SELECT COUNT(ii) FROM InventoryItem ii WHERE ii.inventory.id = :inventoryId AND ii.difference <> 0 AND ii.difference IS NOT NULL")
    long countDiscrepanciesByInventoryId(@Param("inventoryId") Long inventoryId);
}
