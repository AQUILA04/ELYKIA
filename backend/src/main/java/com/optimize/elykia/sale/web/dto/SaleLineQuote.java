package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.SaleLinePricing;
import com.optimize.elykia.inventory.domain.SalePackMode;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SaleLineQuote {
    SalePackMode mode;
    String label;
    int unitQuantity;
    Integer packCount;
    Integer unitsPerPack;
    double packPrice;
    double lineAmount;
    double linePurchaseAmount;
    double lineMargin;

    public void apply(CreditArticles line) {
        line.setQuantity(unitQuantity);
        if (mode == SalePackMode.UNIT) {
            line.setUnitPrice(packPrice);
        } else if (line.getUnitPrice() == null || line.getUnitPrice() <= 0) {
            line.setUnitPrice(packPrice);
        }
        line.setUnitPurchaseCost(unitQuantity > 0 ? linePurchaseAmount / unitQuantity : 0);
        SaleLinePricing pricing = line.getSaleLine() != null ? line.getSaleLine() : new SaleLinePricing();
        fill(pricing);
        line.setSaleLine(pricing);
    }

    public void fill(SaleLinePricing pricing) {
        pricing.setSalePackMode(mode);
        pricing.setPackLabel(label);
        pricing.setPackCount(packCount);
        pricing.setUnitsPerPack(unitsPerPack);
        pricing.setPackPrice(packPrice);
        pricing.setLineAmount(lineAmount);
        pricing.setLinePurchaseAmount(linePurchaseAmount);
        pricing.setLineMargin(lineMargin);
    }
}
