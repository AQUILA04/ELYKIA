package com.optimize.elykia.core.dto.notification;

import com.optimize.elykia.core.enumaration.AppNotificationType;

import java.time.LocalDate;

public record AppNotificationDto(
        Long id,
        AppNotificationType type,
        Long entityId,
        String entityReference,
        String title,
        String message,
        Long clientId,
        String clientName,
        String targetCollector,
        String tontineCollector,
        LocalDate operationDate,
        Double amount,
        String linkPath,
        String linkQuery,
        boolean read,
        boolean resolved
) {
}
