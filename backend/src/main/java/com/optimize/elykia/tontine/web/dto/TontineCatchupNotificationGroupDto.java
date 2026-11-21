package com.optimize.elykia.tontine.web.dto;

import java.time.LocalDate;
import java.util.List;

public record TontineCatchupNotificationGroupDto(
        LocalDate operationDate,
        List<TontineCatchupNotificationDto> items
) {
}
