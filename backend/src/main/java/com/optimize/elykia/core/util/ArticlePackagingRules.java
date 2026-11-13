package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;

/**
 * Taille du colis et du demi-gros. Le demi-gros d'un colis pair est la moitié.
 * Un colis impair n'a de demi-gros que si une quantité entière a été saisie.
 */
public final class ArticlePackagingRules {

    private ArticlePackagingRules() {
    }

    public static boolean hasPackaging(Articles article) {
        if (article == null || article.getPackagingType() == null
                || article.getPackagingType() == ArticlePackagingType.NONE) {
            return false;
        }
        Integer units = article.getUnitsPerPackage();
        return units != null && units >= 2;
    }

    public static Integer halfUnits(Articles article) {
        if (!hasPackaging(article)) {
            return null;
        }
        int units = article.getUnitsPerPackage();
        if (units % 2 == 0) {
            return units / 2;
        }
        Integer specified = article.getUnitsPerHalfPackage();
        if (specified == null || specified < 1 || specified >= units) {
            return null;
        }
        return specified;
    }

    public static boolean hasHalf(Articles article) {
        return halfUnits(article) != null;
    }

    public static void normalize(Articles article) {
        if (article == null) {
            return;
        }
        if (article.getPackagingType() == null) {
            article.setPackagingType(ArticlePackagingType.NONE);
        }
        if (article.getPackagingType() == ArticlePackagingType.NONE) {
            article.setUnitsPerPackage(null);
            article.setUnitsPerHalfPackage(null);
            article.setWholesalePurchasePrice(null);
            article.setHalfWholesalePurchasePrice(null);
            article.setWholesaleSalePrice(null);
            article.setHalfWholesaleSalePrice(null);
            return;
        }
        Integer units = article.getUnitsPerPackage();
        if (units != null && units % 2 == 0) {
            article.setUnitsPerHalfPackage(null);
        }
        if (!hasHalf(article)) {
            article.setHalfWholesalePurchasePrice(null);
            article.setHalfWholesaleSalePrice(null);
        }
    }
}
