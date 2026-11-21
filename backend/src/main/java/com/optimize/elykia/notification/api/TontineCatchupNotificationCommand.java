package com.optimize.elykia.notification.api;

import java.time.LocalDate;

public record TontineCatchupNotificationCommand(
        boolean catchup,
        Long collectionId,
        String collectionReference,
        String clientName,
        String collector,
        LocalDate operationDate,
        Double amount
) {
}
