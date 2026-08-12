package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RmPackTontineMonthDto {
    private Integer year;
    /** Calendar month 1–12 (tontine session: 2–11). */
    private Integer month;
    private Double systemAmount;
}
