package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;

import java.util.ArrayList;
import java.util.List;

/**
 * Complément encaissé à la remise : il augmente le solde disponible en entier,
 * sans ouvrir un mois ni reprendre une part société.
 */
public final class TontineBalanceTopUp {

    private TontineBalanceTopUp() {
    }

    public static boolean isTopUp(TontineCollection collection) {
        return collection != null && Boolean.TRUE.equals(collection.getBalanceTopUp());
    }

    public static List<TontineCollection> regular(List<TontineCollection> collections) {
        if (collections == null || collections.isEmpty()) {
            return List.of();
        }
        List<TontineCollection> regular = new ArrayList<>();
        for (TontineCollection collection : collections) {
            if (!isTopUp(collection)) {
                regular.add(collection);
            }
        }
        return regular;
    }

    public static void apply(TontineMember member, List<TontineCollection> collections) {
        if (member == null || collections == null || collections.isEmpty()) {
            return;
        }
        double extra = 0.0;
        for (TontineCollection collection : collections) {
            if (!isTopUp(collection)) {
                continue;
            }
            double amount = collection.getAmount() != null ? collection.getAmount() : 0.0;
            extra += amount;
            collection.setSocietyShareAmount(0.0);
        }
        if (extra <= 0.0) {
            return;
        }
        double total = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;
        double available = member.getAvailableContribution() != null ? member.getAvailableContribution() : 0.0;
        member.setTotalContribution(total + extra);
        member.setAvailableContribution(Math.max(0.0, available + extra));
    }
}
