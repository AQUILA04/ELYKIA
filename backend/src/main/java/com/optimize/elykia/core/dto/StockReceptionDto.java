package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import com.optimize.elykia.core.enumaration.ReceptionStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockReceptionDto {
    private Long id;
    private String reference;
    private LocalDate receptionDate;
    private String receivedBy;
    private Double totalAmount;
    private ReceptionStatus status;
    private String validatedBy;
    private LocalDateTime validatedAt;
    private String refusedBy;
    private LocalDateTime refusedAt;
    private String refusalReason;
    private String cancelledBy;
    private LocalDateTime cancelledAt;
    private Set<StockReceptionItemDto> items;
}
