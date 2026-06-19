package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CustomerDashboardDto {
    private String clientId;
    private String fullName;
    private int activeCreditCount;
    private double totalCreditAmount;
    private double totalPaidAmount;
    private double totalRemainingAmount;
    private double nextPaymentAmount;
    private String nextPaymentDate;
    private double progressPercent;
    private List<CustomerActivityDto> recentActivities;
}
