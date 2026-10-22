package com.optimize.elykia.core.dto.carnet;

import com.optimize.elykia.core.enumaration.CarnetEcartDirection;
import com.optimize.elykia.core.enumaration.CarnetEcartDomain;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class CarnetEcartItemDto {
    String key;
    CarnetEcartDomain domain;
    Long controlId;
    String commercialUsername;
    String clientName;
    String subjectReference;
    LocalDateTime observedAt;
    double systemAmount;
    double notebookAmount;
    double differenceAmount;
    CarnetEcartDirection direction;
    CarnetEcartStatus status;
    double acceptableAmount;
    double pendingInverseAmount;
    boolean commercialKnown;
    List<CarnetEcartMonthDto> months;
}
