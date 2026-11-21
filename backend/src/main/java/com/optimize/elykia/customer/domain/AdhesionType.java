package com.optimize.elykia.customer.domain;

import com.optimize.elykia.sale.domain.CreditPurpose;
public enum AdhesionType {
    PERSONAL,
    BUSINESS,
    EVENT;

    public CreditPurpose toCreditPurpose() {
        return CreditPurpose.valueOf(name());
    }

    public static AdhesionType fromCreditPurpose(CreditPurpose purpose) {
        if (purpose == null) {
            return PERSONAL;
        }
        return AdhesionType.valueOf(purpose.name());
    }
}
