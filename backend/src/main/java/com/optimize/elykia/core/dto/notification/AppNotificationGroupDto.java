package com.optimize.elykia.core.dto.notification;

import java.time.LocalDate;
import java.util.List;

public record AppNotificationGroupDto(
        LocalDate operationDate,
        List<AppNotificationDto> items
) {
}
