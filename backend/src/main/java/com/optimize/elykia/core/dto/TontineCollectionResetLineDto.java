package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.report.TontineCollectionResetLine;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TontineCollectionResetLineDto(
        Long id,
        Long collectionId,
        Long tontineMemberId,
        String clientName,
        String clientCode,
        String quarter,
        Double amount,
        LocalDateTime collectionDate,
        String commercialUsername,
        String reference,
        Double societyShareAmount,
        Boolean deliveryCollection,
        LocalDate contributionMonth
) {
    public static TontineCollectionResetLineDto from(TontineCollectionResetLine line) {
        return new TontineCollectionResetLineDto(
                line.getId(),
                line.getCollectionId(),
                line.getTontineMemberId(),
                line.getClientName(),
                line.getClientCode(),
                line.getQuarter(),
                line.getAmount(),
                line.getCollectionDate(),
                line.getCommercialUsername(),
                line.getReference(),
                line.getSocietyShareAmount(),
                line.getDeliveryCollection(),
                line.getContributionMonth()
        );
    }
}
