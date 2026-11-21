package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.inventory.domain.Inventory;
import com.optimize.elykia.inventory.infrastructure.persistence.InventoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryWarehouseGuardTest {

    @Mock
    private InventoryRepository inventoryRepository;
    @InjectMocks
    private InventoryWarehouseGuard inventoryWarehouseGuard;

    @Test
    void assertWarehouseStockMutable_rejectsWhileAnInventoryLocksTheWarehouse() {
        when(inventoryRepository.findInventoryLockingWarehouse()).thenReturn(Optional.of(new Inventory()));

        ApplicationException error = assertThrows(
                ApplicationException.class,
                () -> inventoryWarehouseGuard.assertWarehouseStockMutable());

        assertEquals(InventoryWarehouseGuard.BLOCKED_MESSAGE, error.getMessage());
    }

    @Test
    void assertWarehouseStockMutable_allowsOperationsWhenNoInventoryLocksTheWarehouse() {
        when(inventoryRepository.findInventoryLockingWarehouse()).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> inventoryWarehouseGuard.assertWarehouseStockMutable());
    }
}
