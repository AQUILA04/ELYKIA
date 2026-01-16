package com.optimize.elykia.core.enumaration;

public enum InventoryItemStatus {
    PENDING,        // En attente - quantité physique pas encore saisie
    VALIDATED,      // Validé - quantité physique = quantité système
    DEBT,           // Dette - quantité système > quantité physique
    SURPLUS,        // Surplus - quantité système < quantité physique
    RECONCILED      // Réconcilié - écart traité et résolu
}

