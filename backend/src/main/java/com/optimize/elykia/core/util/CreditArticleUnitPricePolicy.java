package com.optimize.elykia.core.util;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.enumaration.CreditStatus;

import java.util.EnumSet;
import java.util.Set;

/**
 * Règle métier : le prix unitaire d'une ligne de vente est figé dès que le crédit passe en cours
 * ({@link CreditStatus#INPROGRESS}) et ne doit plus jamais être recalculé depuis le catalogue ou le stock.
 */
public final class CreditArticleUnitPricePolicy {

    private static final Set<CreditStatus> FROZEN_STATUSES = EnumSet.of(
            CreditStatus.INPROGRESS,
            CreditStatus.DELIVERED,
            CreditStatus.ENDED,
            CreditStatus.SETTLED,
            CreditStatus.MERGED
    );

    private CreditArticleUnitPricePolicy() {
    }

    public static boolean isUnitPriceFrozen(CreditStatus status) {
        return status != null && FROZEN_STATUSES.contains(status);
    }

    public static boolean isUnitPriceMutable(CreditArticles article) {
        if (article == null || article.getCredit() == null) {
            return true;
        }
        return !isUnitPriceFrozen(article.getCredit().getStatus());
    }

    public static void assertUnitPriceMutable(CreditArticles article) {
        if (!isUnitPriceMutable(article)) {
            throw new CustomValidationException(
                    "Le prix unitaire est figé pour une vente en cours ou clôturée et ne peut plus être modifié.");
        }
    }
}
