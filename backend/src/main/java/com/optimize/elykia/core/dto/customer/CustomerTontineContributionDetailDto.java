package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CustomerTontineContributionDetailDto {
    private String memberId;
    private Integer sessionYear;
    private String deliveryStatus;
    private String sessionStatus;
    private double dailyStake;
    private double totalContribution;
    private double societyShare;
    private double availableContribution;
    private int validatedMonths;
    private int currentMonthDays;
    private String registrationDate;
    private String sessionStartDate;
    private String sessionEndDate;
    private List<CustomerTontineMonthlySummaryDto> monthlySummaries;
}
