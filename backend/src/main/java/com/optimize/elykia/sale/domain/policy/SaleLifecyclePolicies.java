package com.optimize.elykia.sale.domain.policy;

import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.SaleType;

import java.util.Objects;

/**
 * Résolveur exhaustif de {@link SaleLifecyclePolicy} par {@link SaleType}.
 */
public final class SaleLifecyclePolicies {

    private SaleLifecyclePolicies() {
    }

    public static SaleLifecyclePolicy forType(SaleType saleType) {
        Objects.requireNonNull(saleType, "saleType must not be null");
        return switch (saleType) {
            case CREDIT -> CreditSalePolicy.INSTANCE;
            case CASH -> CashSalePolicy.INSTANCE;
            case TONTINE -> TontineSalePolicy.INSTANCE;
        };
    }

    public static SaleLifecyclePolicy forCredit(Credit credit) {
        Objects.requireNonNull(credit, "credit must not be null");
        SaleType saleType = credit.getSaleType();
        return forType(saleType != null ? saleType : SaleType.CREDIT);
    }
}
