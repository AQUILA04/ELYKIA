package com.optimize.elykia.client.api;

/** Mode d'opération en masse sur le portefeuille d'un commercial (1 000+ clients / carnets en 1 clic). */
public enum BulkPortfolioOperationMode {
    /** Passer le relais A -> B : A passe INACTIVE (garde consultation sur ses propres opérations) et B devient ACTIVE principal. */
    HANDOVER_RELAY,
    /** Co-affecter B en ACTIVE aux côtés de A (tous deux peuvent opérer). */
    ADD_CO_COMMERCIAL,
    /** Désactiver A (passe INACTIVE : consultation seule sur ses propres opérations). */
    DEACTIVATE_COMMERCIAL,
    /** Réactiver A (repasse ACTIVE ses affectations INACTIVE et, si primary=true, redevient principal). */
    REACTIVATE_COMMERCIAL
}
