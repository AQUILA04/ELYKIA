package com.optimize.elykia.notification.api;

import java.time.LocalDate;

public record CustomerOrderNotificationCommand(
        Long orderId,
        LocalDate operationDate,
        Double totalAmount,
        Long clientId,
        String clientName,
        String targetCollector,
        String tontineCollector
) {
}
