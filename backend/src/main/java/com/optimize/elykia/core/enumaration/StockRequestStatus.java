package com.optimize.elykia.core.enumaration;

public enum StockRequestStatus {
    CREATED,    // Créé par le commercial ou gestionnaire (Brouillon)
    VALIDATED,  // Validé par le gestionnaire (Prêt pour le magasinier)
    DELIVERED,  // Livré par le magasinier (Sortie effective du stock)
    CANCELLED   // Annulé
}
