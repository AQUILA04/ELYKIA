package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OverdueAnalysisDto {
    private String range; // "0-7", "8-15", "16-30", ">30"
    private Integer creditsCount;
    private Double totalAmount;
    private Double percentage;
}
