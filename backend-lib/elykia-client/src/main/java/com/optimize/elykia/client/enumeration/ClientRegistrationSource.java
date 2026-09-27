package com.optimize.elykia.client.enumeration;

/**
 * Source d'inscription du client.
 * Les clients créés par le personnel restent {@link #STAFF}.
 * Les auto-inscriptions depuis l'Espace Client sont {@link #CUSTOMER_SPACE}.
 */
public enum ClientRegistrationSource {
    STAFF,
    CUSTOMER_SPACE
}
