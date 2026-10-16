package com.optimize.elykia.core.dto.sale;

import lombok.Getter;

/**
 * One row of the online recovery-manager tontine field list. Months are loaded on demand.
 */
@Getter
public class RmFieldTontineRowDto {
    private final Long id;
    private final Long clientId;
    private final String clientName;
    private final String clientPhone;
    private final String clientQuarter;
    private final String tontineCollector;
    private final Integer sessionYear;
    private final Double amount;
    private final Double totalContribution;
    private final Boolean carnetVerified;

    public RmFieldTontineRowDto(
            Long id,
            Long clientId,
            String clientName,
            String clientPhone,
            String clientQuarter,
            String tontineCollector,
            Integer sessionYear,
            Double amount,
            Double totalContribution,
            Boolean carnetVerified) {
        this.id = id;
        this.clientId = clientId;
        this.clientName = clientName;
        this.clientPhone = clientPhone;
        this.clientQuarter = clientQuarter;
        this.tontineCollector = tontineCollector;
        this.sessionYear = sessionYear;
        this.amount = amount;
        this.totalContribution = totalContribution;
        this.carnetVerified = carnetVerified;
    }
}
