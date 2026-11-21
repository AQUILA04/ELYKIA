package com.optimize.elykia.reporting.domain;

import org.springframework.stereotype.Component;

@Component
public class MonthlyReportMarginCalculator {

    public double lineMargin(double unitSalePrice, double unitPurchasePrice, int quantity) {
        return (unitSalePrice - unitPurchasePrice) * quantity;
    }

    public double marginRate(double marginAmount, double totalPurchaseAmount) {
        if (totalPurchaseAmount <= 0) {
            return 0.0;
        }
        return (marginAmount / totalPurchaseAmount) * 100.0;
    }
}
