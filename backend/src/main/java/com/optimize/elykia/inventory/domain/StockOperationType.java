package com.optimize.elykia.inventory.domain;

public enum StockOperationType {
    ENTREE,
    SORTIE,
    RETURN, // Retour en stock (augmente le stock)
    RESET,
    INVENTORY_ADJUSTMENT,
    CANCEL_RECEPTION // Annulation de réception (diminue le stock)
}
