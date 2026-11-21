package com.optimize.elykia.tontine.domain;


/**
 * Soldes affichés sur tout reçu ou détail de commande tontine.
 * <ul>
 *     <li>{@code netContribution} : solde net cotisé (cotisations moins la part société, compléments inclus) ;</li>
 *     <li>{@code orderTotal} : montant de la commande ;</li>
 *     <li>{@code amountDue} : reste à payer quand la commande dépasse le solde (sinon 0) ;</li>
 *     <li>{@code refundableBalance} : reliquat à restituer quand la commande est inférieure au solde (sinon 0).</li>
 * </ul>
 * Une commande livrée garde les montants de la remise : le solde net est alors
 * la commande plus le reliquat versé sur le compte du client.
 */
public record TontineOrderBalance(double netContribution, double orderTotal, double amountDue,
                                  double refundableBalance, boolean delivered) {

    private static final double EPSILON = 0.005;

    public static TontineOrderBalance of(double netContribution, double orderTotal, boolean delivered) {
        double net = round(Math.max(0.0, netContribution));
        double total = round(Math.max(0.0, orderTotal));
        double gap = total - net;
        double due = gap > EPSILON ? round(gap) : 0.0;
        double refund = gap < -EPSILON ? round(-gap) : 0.0;
        return new TontineOrderBalance(net, total, due, refund, delivered);
    }

    public static TontineOrderBalance of(TontineDelivery delivery) {
        double total = delivery.getTotalAmount() != null ? delivery.getTotalAmount() : 0.0;
        TontineMember member = delivery.getTontineMember();
        boolean delivered = member != null && member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED;
        if (delivered) {
            double remaining = delivery.getRemainingBalance() != null ? Math.max(0.0, delivery.getRemainingBalance()) : 0.0;
            return of(total + remaining, total, true);
        }
        double available = member != null && member.getAvailableContribution() != null
                ? member.getAvailableContribution()
                : 0.0;
        return of(available, total, false);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
