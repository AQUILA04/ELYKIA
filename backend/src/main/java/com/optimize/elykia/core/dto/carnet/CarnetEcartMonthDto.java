package com.optimize.elykia.core.dto.carnet;

import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CarnetEcartMonthDto {
    Long lineId;
    Integer year;
    Integer month;
    double systemAmount;
    double notebookAmount;
    double differenceAmount;
    CarnetEcartStatus status;
}
