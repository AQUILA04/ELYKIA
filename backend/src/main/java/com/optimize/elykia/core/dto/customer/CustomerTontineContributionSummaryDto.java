package com.optimize.elykia.core.dto.customer;

import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class CustomerTontineContributionSummaryDto {
    private String memberId;
    private Integer sessionYear;
    private String deliveryStatus;
    private Double dailyStake;
    private Double totalContribution;
    private Double societyShare;
    private Double availableContribution;
    private Integer validatedMonths;
    private Integer currentMonthDays;
    private String registrationDate;
    private String sessionStartDate;
    private String sessionEndDate;
    private String sessionStatus;

    public CustomerTontineContributionSummaryDto(
            Long memberId,
            Integer sessionYear,
            TontineMemberDeliveryStatus deliveryStatus,
            Double dailyStake,
            Double totalContribution,
            Double societyShare,
            Double availableContribution,
            Integer validatedMonths,
            Integer currentMonthDays,
            LocalDateTime registrationDate,
            LocalDate sessionStartDate,
            LocalDate sessionEndDate,
            TontineSessionStatus sessionStatus) {
        this.memberId = memberId != null ? String.valueOf(memberId) : null;
        this.sessionYear = sessionYear;
        this.deliveryStatus = deliveryStatus != null ? deliveryStatus.name() : null;
        this.dailyStake = dailyStake;
        this.totalContribution = totalContribution;
        this.societyShare = societyShare;
        this.availableContribution = availableContribution;
        this.validatedMonths = validatedMonths;
        this.currentMonthDays = currentMonthDays;
        this.registrationDate = registrationDate != null ? registrationDate.toString() : null;
        this.sessionStartDate = sessionStartDate != null ? sessionStartDate.toString() : null;
        this.sessionEndDate = sessionEndDate != null ? sessionEndDate.toString() : null;
        this.sessionStatus = sessionStatus != null ? sessionStatus.name() : null;
    }
}
