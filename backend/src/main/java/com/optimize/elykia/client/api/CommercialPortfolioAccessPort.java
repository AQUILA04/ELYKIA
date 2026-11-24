package com.optimize.elykia.client.api;

/**
 * Port Hexagonal (SPI) d'accès et d'autorisation au portefeuille commercial :
 * <ul>
 *   <li>{@link AccessMode#READ_WRITE} : commercial {@code ACTIVE} sur le client/dossier (ou profil staff) -> lecture + nouvelles opérations ;</li>
 *   <li>{@link AccessMode#READ_ONLY_OWN_OPERATIONS} : commercial {@code INACTIVE} (ou ancien intervenant) -> lecture uniquement sur ses propres opérations réalisées ;</li>
 *   <li>{@link AccessMode#DENIED} : aucun lien actif ni opération propre -> accès refusé.</li>
 * </ul>
 */
public interface CommercialPortfolioAccessPort {

    enum AccessMode {
        READ_WRITE,
        READ_ONLY_OWN_OPERATIONS,
        DENIED
    }

    AccessMode resolveClientAccess(String commercialUsername, Long clientId, PortfolioActivityType activityType);

    boolean isCommercialActiveOnClient(String commercialUsername, Long clientId, PortfolioActivityType activityType);

    boolean isCommercialInactiveOnClient(String commercialUsername, Long clientId, PortfolioActivityType activityType);

    /** Lève une CustomValidationException si le commercial n'est pas ACTIVE sur cette activité pour ce client. */
    void assertCommercialCanOperateOnClient(String commercialUsername, Long clientId, PortfolioActivityType activityType);
}
