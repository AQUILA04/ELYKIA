package com.optimize.elykia.client.dto;

import com.optimize.elykia.client.entity.BusinessCreditAuthorizationEvent;
import com.optimize.elykia.client.enumeration.BusinessCreditAuthorizationAction;

import java.time.LocalDateTime;

public record BusinessCreditAuthorizationEventDto(
        Long id,
        Long clientId,
        BusinessCreditAuthorizationAction action,
        String performedBy,
        LocalDateTime performedAt
) {
    public static BusinessCreditAuthorizationEventDto fromEntity(BusinessCreditAuthorizationEvent event) {
        return new BusinessCreditAuthorizationEventDto(
                event.getId(),
                event.getClientId(),
                event.getAction(),
                event.getPerformedBy(),
                event.getPerformedAt()
        );
    }
}
