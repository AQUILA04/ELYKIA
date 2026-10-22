package com.optimize.elykia.core.dto.report;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class CatchupAllocationPreviewDto {
    private LocalDate date;
    private String commercialUsername;
    private double remainingCredit;
    private double remainingTontine;
    private double remainingNewBalance;
    private double catchupTotal;
    private double totalRemaining;
    private List<CatchupSliceDto> slices = new ArrayList<>();
}
