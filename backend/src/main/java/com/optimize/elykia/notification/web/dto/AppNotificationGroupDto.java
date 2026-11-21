package com.optimize.elykia.notification.web.dto;

import java.time.LocalDate;
import java.util.List;

public record AppNotificationGroupDto(
        LocalDate operationDate,
        List<AppNotificationDto> items
) {
}
