package com.optimize.elykia.core.dto.carnet;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class CarnetEcartBulkResultDto {
    private final List<CarnetEcartOutcomeDto> succeeded = new ArrayList<>();
    private final List<CarnetEcartOutcomeDto> ignored = new ArrayList<>();
    private final List<CarnetEcartOutcomeDto> errors = new ArrayList<>();
}
