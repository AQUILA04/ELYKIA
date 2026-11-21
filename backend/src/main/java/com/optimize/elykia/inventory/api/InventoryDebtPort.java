package com.optimize.elykia.inventory.api;

import com.optimize.elykia.inventory.domain.Inventory;
import com.optimize.elykia.inventory.domain.InventoryItem;

import java.util.List;
import java.util.Map;

/**
 * Port SPI permettant au module {@code inventory} de déclencher la création d'une dette
 * d'inventaire (écart magasinier) sans dépendre du module {@code finance}/{@code core}.
 */
public interface InventoryDebtPort {

    void createInventoryDebt(
            Inventory inventory,
            String storekeeperUsername,
            List<InventoryItem> items,
            Map<Long, Double> prices);

    void cancelInventoryDebt(Long inventoryId);
}
