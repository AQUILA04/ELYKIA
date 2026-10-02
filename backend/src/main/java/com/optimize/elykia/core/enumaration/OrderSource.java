package com.optimize.elykia.core.enumaration;

/**
 * Origine d'une commande.
 * Les commandes saisies par le personnel restent {@link #STAFF}.
 * Les commandes passées depuis l'Espace Client sont {@link #CUSTOMER_SPACE}.
 */
public enum OrderSource {
    STAFF,
    CUSTOMER_SPACE
}
