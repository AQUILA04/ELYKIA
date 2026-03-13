package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.DailyOperationLog;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DailyOperationExportPdfDto {
    private String title;
    private String startDate;
    private String endDate;
    private String collector;
    private String generationDate;
    private List<DailyOperationLog> operations;
    private Double totalAmount;
    private State state =State.ENABLED;

}
