package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerTontineMonthlySummaryDto {
    private String month;
    private int year;
    private int count;
    private double totalAmount;
    private int equivalentDays;
    private boolean isFuture;
    private boolean isCurrent;
}
