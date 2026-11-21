package com.optimize.elykia.inventory.domain;

public enum MovementType {
    ENTRY,              // Entrée de stock
    RELEASE,            // Sortie de stock
    RETURN,             // Retour
    ADJUSTMENT,         // Ajustement
    LOSS,               // Perte
    INVENTORY_ADJUSTMENT // Ajustement suite à inventaire
}
