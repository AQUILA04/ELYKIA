package com.optimize.elykia.customer.web.dto;

import com.optimize.elykia.customer.domain.CustomerNotificationType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Value
@Builder
public class CustomerNotificationDto {
    Long id;
    CustomerNotificationType type;
    Long entityId;
    String entityReference;
    String title;
    String message;
    Double amount;
    LocalDate operationDate;
    String linkPath;
    String linkQuery;
    boolean read;
    LocalDateTime createdAt;
}
