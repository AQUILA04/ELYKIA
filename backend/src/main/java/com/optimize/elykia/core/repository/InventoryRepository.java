package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends GenericRepository<Inventory, Long> {

    List<Inventory> findByStatusIn(List<InventoryStatus> statuses);

    @Query("SELECT i FROM Inventory i WHERE i.status IN :statuses ORDER BY i.inventoryDate DESC")
    Optional<Inventory> findCurrentInventory(@Param("statuses") List<InventoryStatus> statuses);

    default Optional<Inventory> findCurrentInventory() {
        return findCurrentInventory(List.of(InventoryStatus.DRAFT, InventoryStatus.IN_PROGRESS));
    }

    List<Inventory> findByInventoryDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT i FROM Inventory i WHERE i.status = :status ORDER BY i.inventoryDate DESC")
    List<Inventory> findByStatusOrderByInventoryDateDesc(InventoryStatus status);

    @Query("""
            SELECT i FROM Inventory i
            WHERE (:status IS NULL OR i.status = :status)
              AND (:fromDate IS NULL OR i.inventoryDate >= :fromDate)
              AND (:toDate IS NULL OR i.inventoryDate <= :toDate)
            ORDER BY i.inventoryDate DESC, i.id DESC
            """)
    Page<Inventory> findFiltered(
            @Param("status") InventoryStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);
}
