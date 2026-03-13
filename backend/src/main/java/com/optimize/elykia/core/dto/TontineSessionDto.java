package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class TontineSessionDto {

    private Long id;
    private Integer year;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Integer memberCount;
    private Double totalCollected;
    private Double totalRevenue;
    private State state =State.ENABLED;

}
