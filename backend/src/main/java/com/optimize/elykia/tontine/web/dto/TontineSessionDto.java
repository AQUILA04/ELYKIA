package com.optimize.elykia.tontine.web.dto;

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
}
