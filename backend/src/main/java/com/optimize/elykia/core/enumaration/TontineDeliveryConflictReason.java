package com.optimize.elykia.core.enumaration;

public enum TontineDeliveryConflictReason {
    /** Deuxième commande fusionnée dans la première : le solde couvre les deux. */
    ORDER_MERGED,
    /** Le solde ne couvre pas la première commande augmentée de la seconde. */
    BALANCE_EXCEEDED,
    /** Le membre a déjà été livré. */
    ALREADY_DELIVERED,
    /** Livraison directe alors qu'une commande non livrée existe. */
    ORDER_ALREADY_PENDING
}
