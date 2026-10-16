package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TontineMemberFieldControlLineDto {
    private Long id;
    private Integer year;
    private Integer month;
    /** Null sur les contrôles historiques non découpés par commercial. */
    private String commercialUsername;
    private Double notebookAmount;
    private Double systemAmount;
    private Double differenceAmount;
}
