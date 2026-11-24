package com.optimize.elykia.commercialstock.domain;

import java.util.List;

/** Résultat d'une consommation FIFO : coût d'achat exact et valeur de vente cumulés. */
public record ConsumptionPlan(List<ConsumptionLine> lines) {

    public int totalQuantity() {
        return lines.stream().mapToInt(ConsumptionLine::quantity).sum();
    }

    public double totalPurchaseValue() {
        return lines.stream().mapToDouble(ConsumptionLine::purchaseValue).sum();
    }

    public double totalSaleValue() {
        return lines.stream().mapToDouble(ConsumptionLine::saleValue).sum();
    }

    public double averagePurchaseCost() {
        int quantity = totalQuantity();
        return quantity == 0 ? 0d : totalPurchaseValue() / quantity;
    }

    public double averageSalePrice() {
        int quantity = totalQuantity();
        return quantity == 0 ? 0d : totalSaleValue() / quantity;
    }

    public double marginAmount() {
        return totalSaleValue() - totalPurchaseValue();
    }
}
