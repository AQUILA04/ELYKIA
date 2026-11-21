package com.optimize.elykia.tontine.web.dto;

import java.time.LocalDate;

public record TontineCatchupNotificationDto(
        Long id,
        String commercialUsername,
        LocalDate operationDate,
        LocalDate captureDate,
        Double amount,
        String clientName,
        String collectionReference,
        boolean read
) {
}
