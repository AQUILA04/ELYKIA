package com.optimize.elykia.core.dto.report;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class CatchupSliceDto {
    private LocalDate collectionDate;
    private double capturedAmount;
    private double openRemaining;
    private double cap;

    public CatchupSliceDto(LocalDate collectionDate, double capturedAmount, double openRemaining, double cap) {
        this.collectionDate = collectionDate;
        this.capturedAmount = capturedAmount;
        this.openRemaining = openRemaining;
        this.cap = cap;
    }
}
