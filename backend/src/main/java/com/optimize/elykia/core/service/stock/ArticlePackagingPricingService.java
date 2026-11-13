package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.stock.PackagingEntryResolution;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;
import com.optimize.elykia.core.util.ArticlePackagingRules;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Conversion packaging (gros / demi-gros) → quantités unitaires et PU achat.
 * Utilisé uniquement lorsque le flag FIFO est actif.
 */
@Service
public class ArticlePackagingPricingService {

    private static final int MONEY_SCALE = 2;

    public void validateArticlePackaging(Articles article) {
        ArticlePackagingRules.normalize(article);
        if (article.getPackagingType() == ArticlePackagingType.NONE) {
            return;
        }

        Integer units = article.getUnitsPerPackage();
        if (units == null || units < 2) {
            throw new CustomValidationException(
                    "Le nombre d'unités par colis doit être un entier ≥ 2 lorsque le packaging est défini.");
        }
        if (units % 2 != 0 && article.getUnitsPerHalfPackage() != null) {
            int half = article.getUnitsPerHalfPackage();
            if (half < 1 || half >= units) {
                throw new CustomValidationException(
                        "Le nombre d'unités du demi-gros doit être un entier entre 1 et " + (units - 1) + ".");
            }
        }
        if (article.getWholesalePurchasePrice() != null && article.getWholesalePurchasePrice() < 0) {
            throw new CustomValidationException("Le prix d'achat gros ne peut pas être négatif.");
        }
        if (article.getHalfWholesalePurchasePrice() != null && article.getHalfWholesalePurchasePrice() < 0) {
            throw new CustomValidationException("Le prix d'achat demi-gros ne peut pas être négatif.");
        }
        if (article.getWholesaleSalePrice() != null && article.getWholesaleSalePrice() < 0) {
            throw new CustomValidationException("Le prix de vente gros ne peut pas être négatif.");
        }
        if (article.getHalfWholesaleSalePrice() != null && article.getHalfWholesaleSalePrice() < 0) {
            throw new CustomValidationException("Le prix de vente demi-gros ne peut pas être négatif.");
        }
    }

    /**
     * Résout quantité unitaire + PU + total à partir du mode d'entrée FIFO.
     * En mode UNIT (défaut), utilise quantity / unitPrice du payload.
     */
    public PackagingEntryResolution resolveFifoEntry(Articles article, StockEntry entry) {
        StockEntryPackagingMode mode = entry.getEntryPackagingMode() != null
                ? entry.getEntryPackagingMode()
                : StockEntryPackagingMode.UNIT;

        ArticlePackagingType packagingType = article.getPackagingType() != null
                ? article.getPackagingType()
                : ArticlePackagingType.NONE;
        Integer unitsPerPackage = article.getUnitsPerPackage();

        if (mode == StockEntryPackagingMode.UNIT) {
            if (entry.getQuantity() == null || entry.getQuantity() < 1) {
                throw new CustomValidationException(
                        "La quantité d'entrée unitaire est obligatoire et doit être ≥ 1.");
            }
            if (entry.getUnitPrice() == null || entry.getUnitPrice() <= 0) {
                throw new CustomValidationException(
                        "Le prix d'achat unitaire est obligatoire pour une entrée de stock (mode FIFO).");
            }
            double unitPrice = roundMoney(entry.getUnitPrice());
            int quantity = entry.getQuantity();
            double totalPrice = roundMoney(unitPrice * quantity);
            return new PackagingEntryResolution(
                    quantity,
                    unitPrice,
                    totalPrice,
                    StockEntryPackagingMode.UNIT,
                    null,
                    null,
                    packagingType != ArticlePackagingType.NONE ? packagingType : null,
                    packagingType != ArticlePackagingType.NONE ? unitsPerPackage : null
            );
        }

        if (packagingType == ArticlePackagingType.NONE || unitsPerPackage == null || unitsPerPackage < 2) {
            throw new CustomValidationException(
                    "Cet article n'a pas de packaging configuré : saisie gros/demi-gros impossible.");
        }
        if (mode == StockEntryPackagingMode.HALF_WHOLESALE && !ArticlePackagingRules.hasHalf(article)) {
            throw new CustomValidationException(
                    "Cet article n'a pas de demi-gros : indiquez le nombre d'unités du demi-gros sur la fiche.");
        }
        if (entry.getPackageCount() == null || entry.getPackageCount() < 1) {
            throw new CustomValidationException("Le nombre de colis (ou demi-colis) doit être ≥ 1.");
        }
        if (entry.getPackagePrice() == null || entry.getPackagePrice() <= 0) {
            throw new CustomValidationException("Le prix du colis (ou demi-colis) est obligatoire et doit être > 0.");
        }

        int packageCount = entry.getPackageCount();
        double packagePrice = roundMoney(entry.getPackagePrice());
        int unitsInMode;
        if (mode == StockEntryPackagingMode.WHOLESALE) {
            unitsInMode = unitsPerPackage;
        } else if (mode == StockEntryPackagingMode.HALF_WHOLESALE) {
            unitsInMode = ArticlePackagingRules.halfUnits(article);
        } else {
            throw new CustomValidationException("Mode d'entrée packaging inconnu : " + mode);
        }

        int quantity = packageCount * unitsInMode;
        double unitPrice = divideMoney(packagePrice, unitsInMode);
        double totalPrice = roundMoney(packagePrice * packageCount);

        return new PackagingEntryResolution(
                quantity,
                unitPrice,
                totalPrice,
                mode,
                packageCount,
                packagePrice,
                packagingType,
                unitsPerPackage
        );
    }

    private static double roundMoney(double value) {
        return BigDecimal.valueOf(value).setScale(MONEY_SCALE, RoundingMode.HALF_UP).doubleValue();
    }

    private static double divideMoney(double numerator, int denominator) {
        return BigDecimal.valueOf(numerator)
                .divide(BigDecimal.valueOf(denominator), MONEY_SCALE, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
