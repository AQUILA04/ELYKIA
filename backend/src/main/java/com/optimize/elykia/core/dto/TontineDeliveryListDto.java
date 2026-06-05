package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TontineDeliveryListDto {
    private Long id;
    private Long tontineMemberId;
    private Long clientId;
    private String clientFirstname;
    private String clientLastname;
    private String clientPhone;
    private String reference;
    private LocalDateTime deliveryDate;
    private LocalDateTime requestDate;
    private Double totalAmount;
    private Double remainingBalance;
    private String commercialUsername;
    private TontineMemberDeliveryStatus deliveryStatus;
    private Integer itemCount;
}
