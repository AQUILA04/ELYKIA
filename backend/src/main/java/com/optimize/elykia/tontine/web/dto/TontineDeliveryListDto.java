package com.optimize.elykia.tontine.web.dto;

import com.optimize.elykia.tontine.domain.TontineMemberDeliveryStatus;
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
    private String authenticityCode;
    private LocalDateTime deliveryDate;
    private LocalDateTime requestDate;
    /** Date de livraison prévue, optionnelle. */
    private java.time.LocalDate plannedDeliveryDate;
    private Double totalAmount;
    private Double remainingBalance;
    private String commercialUsername;
    private TontineMemberDeliveryStatus deliveryStatus;
    private Integer itemCount;
}
