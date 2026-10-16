package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.FieldControlStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TontineMemberFieldControlCollectorDto {
    private String commercialUsername;
    private Double notebookTotalAmount;
    private Double systemTotalAmount;
    private Double differenceAmount;
    private FieldControlStatus status;
}
