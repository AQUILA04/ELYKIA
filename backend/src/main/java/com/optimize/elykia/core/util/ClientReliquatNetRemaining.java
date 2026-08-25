package com.optimize.elykia.core.util;

import com.optimize.elykia.core.dto.DailyUnrecoveredCreditDto;
import com.optimize.elykia.core.entity.sale.ClientReliquat;
import com.optimize.elykia.core.repository.ClientReliquatRepository;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Calcule le restant net après imputation du reliquat client.
 * Si un client a plusieurs crédits, le reliquat est consommé dans l'ordre
 * sans double comptage.
 */
public final class ClientReliquatNetRemaining {

    private ClientReliquatNetRemaining() {
    }

    public static Map<Long, Double> loadAvailableByClient(
            ClientReliquatRepository repository, Collection<Long> clientIds) {
        if (repository == null || clientIds == null || clientIds.isEmpty()) {
            return new HashMap<>();
        }
        Map<Long, Double> remainingReliquat = new HashMap<>();
        for (ClientReliquat reliquat : repository.findByClientIdIn(clientIds)) {
            if (reliquat.getClient() == null || reliquat.getClient().getId() == null) {
                continue;
            }
            double amount = reliquat.getTotalAmount() != null ? reliquat.getTotalAmount() : 0.0;
            remainingReliquat.put(reliquat.getClient().getId(), Math.max(0.0, amount));
        }
        return remainingReliquat;
    }

    /**
     * Consomme le reliquat disponible du client et retourne le montant imputé.
     */
    public static double consume(Map<Long, Double> remainingReliquat, Long clientId, double remaining) {
        if (clientId == null || remainingReliquat == null || remaining <= 0) {
            return 0.0;
        }
        double available = remainingReliquat.getOrDefault(clientId, 0.0);
        if (available <= 0) {
            return 0.0;
        }
        double applied = Math.min(remaining, available);
        remainingReliquat.put(clientId, available - applied);
        return applied;
    }

    /**
     * Déduit le reliquat du restant affiché sur les crédits d'opération journalière (liste / PDF).
     */
    public static void applyToDailyCredits(
            ClientReliquatRepository repository, List<DailyUnrecoveredCreditDto> credits) {
        if (repository == null || credits == null || credits.isEmpty()) {
            return;
        }
        Set<Long> clientIds = new HashSet<>();
        for (DailyUnrecoveredCreditDto credit : credits) {
            if (credit.getClientId() != null) {
                clientIds.add(credit.getClientId());
            }
        }
        Map<Long, Double> remainingReliquat = loadAvailableByClient(repository, clientIds);
        for (DailyUnrecoveredCreditDto credit : credits) {
            double remaining = credit.getTotalAmountRemaining() != null ? credit.getTotalAmountRemaining() : 0.0;
            double applied = consume(remainingReliquat, credit.getClientId(), remaining);
            if (applied > 0) {
                credit.setTotalAmountRemaining(remaining - applied);
            }
        }
    }
}
