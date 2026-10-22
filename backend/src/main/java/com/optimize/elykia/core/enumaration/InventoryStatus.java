package com.optimize.elykia.core.enumaration;

public enum InventoryStatus {
    DRAFT,          // Brouillon - inventaire créé mais pas encore utilisé
    IN_PROGRESS,    // En cours - quantités physiques en cours de saisie ou réconciliation
    SUSPENDED,      // Suspendu - stock magasin de nouveau modifiable, snapshot à refaire à la reprise
    COMPLETED,      // Complété - inventaire finalisé sans écarts
    RECONCILED,     // Réconcilié - inventaire avec écarts réconciliés et finalisé
    CANCELLED       // Annulé - brouillon abandonné, sans impact sur le stock
}

