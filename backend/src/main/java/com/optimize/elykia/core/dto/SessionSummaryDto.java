package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SessionSummaryDto {
    
    private Integer year;
    private Integer totalMembers;
    private Double totalCollected;
    private Double averageContribution;
    private Double deliveryRate;
    private String topCommercial;
    private State state =State.ENABLED;

}
