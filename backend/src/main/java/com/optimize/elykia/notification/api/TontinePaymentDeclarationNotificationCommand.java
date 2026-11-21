package com.optimize.elykia.notification.api;

import java.time.LocalDate;

public record TontinePaymentDeclarationNotificationCommand(
        Long submissionId,
        String mobileMoneyReference,
        Double mobileMoneyAmount,
        LocalDate operationDate,
        Long clientId,
        String clientName,
        String tontineCollector
) {
}
