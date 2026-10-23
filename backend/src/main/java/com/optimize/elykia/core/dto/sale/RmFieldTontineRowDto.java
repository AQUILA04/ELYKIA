package com.optimize.elykia.core.dto.sale;

import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import lombok.Getter;

import java.time.LocalDateTime;

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
    /** Dernier contrôle terrain, pas seulement celui du jour. */
    private final String latestControlStatus;
    private final Double latestDifferenceAmount;
    private final LocalDateTime latestObservedAt;
    private final CarnetEcartStatus ecartDecisionStatus;
    private final Boolean modifiable;

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
        this(
                id,
                clientId,
                clientName,
                clientPhone,
                clientQuarter,
                tontineCollector,
                sessionYear,
                amount,
                totalContribution,
                carnetVerified,
                null,
                null,
                null,
                null,
                null);
    }

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
            Boolean carnetVerified,
            String latestControlStatus,
            Double latestDifferenceAmount,
            LocalDateTime latestObservedAt,
            CarnetEcartStatus ecartDecisionStatus,
            Boolean modifiable) {
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
        this.latestControlStatus = latestControlStatus;
        this.latestDifferenceAmount = latestDifferenceAmount;
        this.latestObservedAt = latestObservedAt;
        this.ecartDecisionStatus = ecartDecisionStatus;
        this.modifiable = modifiable;
    }

    public RmFieldTontineRowDto withLatestControl(
            String status,
            Double differenceAmount,
            LocalDateTime observedAt,
            CarnetEcartStatus decisionStatus,
            Boolean canModify) {
        return new RmFieldTontineRowDto(
                id,
                clientId,
                clientName,
                clientPhone,
                clientQuarter,
                tontineCollector,
                sessionYear,
                amount,
                totalContribution,
                carnetVerified,
                status,
                differenceAmount,
                observedAt,
                decisionStatus,
                canModify);
    }
}
