package com.optimize.elykia.core.dto;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;

public record CreditSearchDto(String keyword, ClientType clientType, OperationType type, CreditStatus status, String commercial, Long clientId) {
}
