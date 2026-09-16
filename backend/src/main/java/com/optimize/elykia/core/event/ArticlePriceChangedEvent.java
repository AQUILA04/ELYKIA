package com.optimize.elykia.core.event;

import lombok.Getter;

/**
 * Publié après commit d'une mise à jour de prix article lorsque le
 * réalignement auto du stock est activé.
 */
@Getter
public class ArticlePriceChangedEvent {

    private final Long articleId;
    private final double oldSellingPrice;
    private final double newSellingPrice;
    private final double oldCreditSalePrice;
    private final double newCreditSalePrice;
    private final boolean commercialSync;
    private final boolean tontineSync;
    private final String actingUsername;

    public ArticlePriceChangedEvent(
            Long articleId,
            double oldSellingPrice,
            double newSellingPrice,
            double oldCreditSalePrice,
            double newCreditSalePrice,
            boolean commercialSync,
            boolean tontineSync,
            String actingUsername) {
        this.articleId = articleId;
        this.oldSellingPrice = oldSellingPrice;
        this.newSellingPrice = newSellingPrice;
        this.oldCreditSalePrice = oldCreditSalePrice;
        this.newCreditSalePrice = newCreditSalePrice;
        this.commercialSync = commercialSync;
        this.tontineSync = tontineSync;
        this.actingUsername = actingUsername;
    }
}
