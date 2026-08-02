package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TontineMemberFieldControlLineDto {
    private Long id;
    private Integer year;
    private Integer month;
    private Double notebookAmount;
    private Double systemAmount;
    private Double differenceAmount;
}
