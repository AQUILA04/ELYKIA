package com.optimize.elykia.tontine.domain;

/** Saisie reçue par le serveur alors que le membre a déjà une commande ou une livraison. */
public enum TontineDeliveryConflictOperation {
    /** Nouvelle commande (POST /tontines/deliveries). */
    ORDER,
    /** Livraison directe (POST /tontines/deliveries/distribute). */
    DIRECT_DELIVERY,
    /** Remise d'une commande existante (PATCH /tontines/deliveries/{id}/deliver). */
    DELIVER
}
