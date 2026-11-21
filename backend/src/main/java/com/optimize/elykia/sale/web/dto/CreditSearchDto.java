package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.shared.domain.OperationType;

public record CreditSearchDto(
        String keyword,
        ClientType clientType,
        OperationType type,
        CreditStatus status,
        String commercial,
        Long clientId,
        Boolean searchByReference,
        Boolean carnetVerified) {
}
