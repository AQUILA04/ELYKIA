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
    /** ID du crédit concerné par la prochaine mise (null si aucun paiement en attente). */
    private String nextPaymentCreditId;
    /** Numéro de la prochaine échéance à régler. */
    private int nextInstallmentNumber;
    private double progressPercent;
    private List<CustomerActivityDto> recentActivities;
}
