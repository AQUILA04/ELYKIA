package com.optimize.elykia.core.dto.report;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Ventilation de l'ajustement rattrapages pour un commercial. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CatchupCashAdjustmentLineDto {
    private String commercialUsername;
    private double catchupReceivedAmount;
    private double deferredAmount;
    /** Rattrapages saisis pendant la période pour une cotisation hors période. */
    private double catchupEnteredAmount;
}
