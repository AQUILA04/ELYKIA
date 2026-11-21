package com.optimize.elykia.notification.api;

public record PaymentDeclarationNotificationCommand(
        Long submissionId,
        String mobileMoneyReference,
        Integer installmentNumber,
        Double mobileMoneyAmount,
        Long clientId,
        String clientName,
        String targetCollector,
        String tontineCollector
) {
}
