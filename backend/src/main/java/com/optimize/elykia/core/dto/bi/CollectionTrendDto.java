package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionTrendDto {
    private LocalDate date;
    private Double collected;
    private Double expected;
    private Double collectionRate;
    private Integer paymentsCount;
}
