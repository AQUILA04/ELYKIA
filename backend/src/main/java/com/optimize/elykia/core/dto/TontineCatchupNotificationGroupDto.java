package com.optimize.elykia.core.dto;

import java.time.LocalDate;
import java.util.List;

public record TontineCatchupNotificationGroupDto(
        LocalDate operationDate,
        List<TontineCatchupNotificationDto> items
) {
}
