package com.optimize.elykia.client.repository.spec;

import com.optimize.elykia.client.entity.Client;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

/**
 * Matching d'un commercial sur tous les rôles collector du client
 * (crédit, tontine, agence, recouvrement).
 */
public final class ClientCommercialPredicates {

    public static final String[] COLLECTOR_FIELDS = {
            "collector", "tontineCollector", "agencyCollector", "recoveryCollector"
    };

    public static final String ANY_EQUALS_C_USERNAME =
            "(c.collector = :username OR c.tontineCollector = :username"
                    + " OR c.agencyCollector = :username OR c.recoveryCollector = :username)";

    public static final String ANY_EQUALS_C_COLLECTOR =
            "(c.collector = :collector OR c.tontineCollector = :collector"
                    + " OR c.agencyCollector = :collector OR c.recoveryCollector = :collector)";

    public static final String ANY_EQUALS_C_COMMERCIAL =
            "(c.collector = :commercial OR c.tontineCollector = :commercial"
                    + " OR c.agencyCollector = :commercial OR c.recoveryCollector = :commercial)";

    private ClientCommercialPredicates() {
    }

    public static boolean matches(String username, String collector, String tontineCollector,
            String agencyCollector, String recoveryCollector) {
        if (username == null || username.isBlank()) {
            return true;
        }
        return username.equals(collector)
                || username.equals(tontineCollector)
                || username.equals(agencyCollector)
                || username.equals(recoveryCollector);
    }

    public static Predicate anyCollectorEquals(Root<Client> root, CriteriaBuilder cb, String username) {
        return cb.or(
                cb.equal(root.get("collector"), username),
                cb.equal(root.get("tontineCollector"), username),
                cb.equal(root.get("agencyCollector"), username),
                cb.equal(root.get("recoveryCollector"), username));
    }

    public static Predicate anyCollectorLikeIgnoreCase(Root<Client> root, CriteriaBuilder cb, String value) {
        String pattern = "%" + value.trim().toLowerCase() + "%";
        return cb.or(
                cb.like(cb.lower(root.get("collector")), pattern),
                cb.like(cb.lower(root.get("tontineCollector")), pattern),
                cb.like(cb.lower(root.get("agencyCollector")), pattern),
                cb.like(cb.lower(root.get("recoveryCollector")), pattern));
    }
}
