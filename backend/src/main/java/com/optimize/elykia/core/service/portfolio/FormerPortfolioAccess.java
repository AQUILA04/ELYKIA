package com.optimize.elykia.core.service.portfolio;

/**
 * Lecture d'un dossier pour un commercial.
 * Le titulaire actuel et les profils non promoteur gardent le dossier complet.
 * L'ancien titulaire n'a que la vue réduite. Les autres sont refusés.
 */
public final class FormerPortfolioAccess {

    public enum Level {
        FULL,
        FORMER,
        DENIED
    }

    private FormerPortfolioAccess() {
    }

    public static Level decide(boolean promoterOnly, boolean currentHolder, boolean formerLink) {
        if (!promoterOnly || currentHolder) {
            return Level.FULL;
        }
        if (formerLink) {
            return Level.FORMER;
        }
        return Level.DENIED;
    }
}
