package com.optimize.elykia.core.dto;

import lombok.Getter;

/**
 * Projection légère pour l'export PDF membres tontine par commercial
 * (évite de charger les entités complètes Client / TontineMember / Session).
 */
@Getter
public class TontineCommercialMemberExportProjectionDto {
    private final Long memberId;
    private final String clientCode;
    private final String firstname;
    private final String lastname;
    private final String quarter;
    private final Double totalContribution;
    private final Double societyShare;
    private final Double availableContribution;

    public TontineCommercialMemberExportProjectionDto(
            Long memberId,
            String clientCode,
            String firstname,
            String lastname,
            String quarter,
            Double totalContribution,
            Double societyShare,
            Double availableContribution) {
        this.memberId = memberId;
        this.clientCode = clientCode;
        this.firstname = firstname;
        this.lastname = lastname;
        this.quarter = quarter;
        this.totalContribution = totalContribution;
        this.societyShare = societyShare;
        this.availableContribution = availableContribution;
    }

    public String getClientName() {
        String first = firstname != null ? firstname.trim() : "";
        String last = lastname != null ? lastname.trim() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "N/A" : full;
    }
}
