package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TontineDeliveryDto {
    
    private Long id;
    private Long tontineMemberId;
    private String clientName;
    private LocalDateTime deliveryDate;
    private LocalDateTime requestDate;
    private Double totalAmount;
    private Double remainingBalance;
    private String commercialUsername;
    private TontineMemberDeliveryStatus deliveryStatus;
    private List<TontineDeliveryItemDto> items;
}
