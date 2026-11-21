package com.optimize.elykia.customer.web.dto;

import com.optimize.elykia.customer.domain.ClientAdhesion;
import com.optimize.elykia.customer.domain.CreditCeilingPolicy;

import java.time.LocalDateTime;

public record AdhesionViewDto(
        Long id,
        Long clientId,
        String adhesionType,
        String status,
        double adhesionFee,
        boolean feeWaived,
        double balance,
        double creditCeiling,
        String source,
        LocalDateTime activatedAt
) {
    public static AdhesionViewDto from(ClientAdhesion adhesion, int dividend, double personalCeiling) {
        double ceiling = adhesion.getStatus() != null
                && adhesion.getStatus().name().equals("ACTIVE")
                ? CreditCeilingPolicy.ceiling(
                        adhesion.getAdhesionType(),
                        adhesion.getBalance(),
                        dividend,
                        personalCeiling)
                : 0d;
        return new AdhesionViewDto(
                adhesion.getId(),
                adhesion.getClient() != null ? adhesion.getClient().getId() : null,
                adhesion.getAdhesionType().name(),
                adhesion.getStatus().name(),
                adhesion.getAdhesionFee(),
                adhesion.isFeeWaived(),
                adhesion.getBalance(),
                ceiling,
                adhesion.getSource().name(),
                adhesion.getActivatedAt());
    }
}
