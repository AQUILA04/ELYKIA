package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerTontineSessionDto {
    private boolean available;
    private Integer year;
    private String startDate;
    private String endDate;
    private String status;
    private boolean joinable;
    private boolean alreadyMember;
    private String memberId;
    private double minDailyStake;
}
