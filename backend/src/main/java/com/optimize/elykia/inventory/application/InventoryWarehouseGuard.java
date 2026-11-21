package com.optimize.elykia.inventory.application;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.inventory.infrastructure.persistence.InventoryRepository;
import org.springframework.stereotype.Service;

@Service
public class InventoryWarehouseGuard {

    public static final String BLOCKED_MESSAGE =
            "Un inventaire est en cours. Veuillez attendre la fin de l'inventaire avant de continuer cette opération.";

    private final InventoryRepository inventoryRepository;

    public InventoryWarehouseGuard(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    public void assertWarehouseStockMutable() {
        if (inventoryRepository.findInventoryLockingWarehouse().isPresent()) {
            throw new ApplicationException(BLOCKED_MESSAGE);
        }
    }
}
