package com.optimize.elykia.shared.carnet;

/**
 * Vue synthétique d'une décision d'écart de carnet (statut + caractère modifiable).
 */
public record EcartDecisionView(CarnetEcartStatus status, boolean modifiable) {

    public static EcartDecisionView none() {
        return new EcartDecisionView(null, false);
    }
}
