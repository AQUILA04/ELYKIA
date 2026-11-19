package com.optimize.elykia.core.dto.report;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Ajustement de caisse lié aux rattrapages tontine sur une période.
 * <ul>
 * <li>{@code catchupReceivedAmount} : remis pendant la période pour des cotisations hors période ;</li>
 * <li>{@code deferredAmount} : cotisations de la période remises hors période ;</li>
 * <li>{@code amount} : écart net ({@code catchupReceivedAmount - deferredAmount}).</li>
 * </ul>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CatchupCashAdjustmentDto {
    private double amount;
    private double catchupReceivedAmount;
    private double deferredAmount;
    private List<CatchupCashAdjustmentLineDto> byCommercial = new ArrayList<>();

    public static CatchupCashAdjustmentDto empty() {
        return new CatchupCashAdjustmentDto(0.0, 0.0, 0.0, new ArrayList<>());
    }
}
