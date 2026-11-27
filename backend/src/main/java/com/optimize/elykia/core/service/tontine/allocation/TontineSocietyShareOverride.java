package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.elykia.core.entity.tontine.TontineMember;

/**
 * Part société saisie à la main (réajustement). Appelé par chaque politique d'allocation juste après
 * le calcul sur les collectes régulières, avant les compléments de livraison.
 * <ul>
 *     <li>la valeur calculée est toujours rangée dans {@code societyShareComputed} ;</li>
 *     <li>si une part a été saisie, elle remplace le calcul, même après de nouvelles collectes :
 *     le métier saisit ce que la personne doit sur toute l'année ;</li>
 *     <li>sans collecte régulière, il n'y a pas de réajustement : la part et le solde restent à 0 ;</li>
 *     <li>la part retenue ne dépasse jamais le total des collectes régulières.</li>
 * </ul>
 */
public final class TontineSocietyShareOverride {

    private TontineSocietyShareOverride() {
    }

    public static void apply(TontineMember member) {
        if (member == null) {
            return;
        }
        double computed = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
        member.setSocietyShareComputed(computed);
        Double override = member.getSocietyShareOverride();
        if (override == null) {
            return;
        }
        double regularTotal = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;
        if (regularTotal <= 0.0) {
            member.setSocietyShare(0.0);
            member.setAvailableContribution(0.0);
            return;
        }
        double effective = Math.max(0.0, Math.min(override, regularTotal));
        member.setSocietyShare(effective);
        member.setAvailableContribution(Math.max(0.0, regularTotal - effective));
    }
}
