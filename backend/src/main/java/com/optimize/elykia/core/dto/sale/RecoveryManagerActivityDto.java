package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Activité terrain d'un chef de recouvrement sur une période.
 * Les « faits » des contrôles sont les dossiers encore dans le portefeuille en cours
 * que le chef a contrôlés sur la période. Les totaux sont le portefeuille live.
 */
@Getter
@Setter
@Builder
public class RecoveryManagerActivityDto {
    private int creditControlsDone;
    private int creditControlsEvents;
    private int creditPortfolioTotal;
    private int creditControlsConforme;
    private int creditControlsEcart;
    private int creditCoveragePercent;

    private int tontineControlsDone;
    private int tontineControlsEvents;
    private int tontinePortfolioTotal;
    private int tontineControlsConforme;
    private int tontineControlsEcart;
    private int tontineCoveragePercent;

    private int creditClosuresCount;
    private int creditFullClosures;
    private int creditPartialClosures;

    private int creditCarnetVerifications;
    private int tontineCarnetVerifications;
}
