package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RmCollectorStatDto {
    private String username;
    private long lateCount;
    private double totalAmountRemaining;
    private List<String> quarters;
}
