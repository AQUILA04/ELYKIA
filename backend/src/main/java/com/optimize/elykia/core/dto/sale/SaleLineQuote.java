package com.optimize.elykia.core.dto.sale;

import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.sale.SaleLinePricing;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.enumaration.SalePackMode;
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

    public void apply(TontineDeliveryItem item) {
        item.setQuantity(unitQuantity);
        item.setUnitPrice(mode == SalePackMode.UNIT ? packPrice : packPrice);
        item.setTotalPrice(lineAmount);
        SaleLinePricing pricing = item.getSaleLine() != null ? item.getSaleLine() : new SaleLinePricing();
        fill(pricing);
        item.setSaleLine(pricing);
    }

    private void fill(SaleLinePricing pricing) {
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
