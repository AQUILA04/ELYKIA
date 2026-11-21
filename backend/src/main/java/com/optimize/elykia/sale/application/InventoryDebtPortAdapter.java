package com.optimize.elykia.sale.application;

import com.optimize.elykia.inventory.api.InventoryDebtPort;
import com.optimize.elykia.inventory.domain.Inventory;
import com.optimize.elykia.inventory.domain.InventoryItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Adaptateur SPI liant le module {@code inventory} à la création de dettes d'inventaire.
 */
@Component
@RequiredArgsConstructor
public class InventoryDebtPortAdapter implements InventoryDebtPort {

    private final DebtService debtService;

    @Override
    public void createInventoryDebt(
            Inventory inventory,
            String storekeeperUsername,
            List<InventoryItem> items,
            Map<Long, Double> prices) {
        debtService.createInventoryDebt(inventory, storekeeperUsername, items, prices);
    }

    @Override
    public void cancelInventoryDebt(Long inventoryId) {
        debtService.cancelInventoryDebt(inventoryId);
    }
}
