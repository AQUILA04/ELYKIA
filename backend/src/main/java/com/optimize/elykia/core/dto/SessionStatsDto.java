package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SessionStatsDto {

    private Long sessionId;
    private Integer year;
    private Integer totalMembers;
    private Double totalCollected;
    private Double averageContribution;
    private Integer deliveredCount;
    private Integer pendingCount;
    private Double deliveryRate;
    private Double totalRevenue;
    private Double totalDeliveryCollections;
    private List<TopCommercialDto> topCommercials;
}
