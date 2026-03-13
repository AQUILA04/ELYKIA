package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditSummaryDto {
    private Long id;
    private String reference;
    private LocalDate beginDate;
    private Double totalAmount;
    private State state =State.ENABLED;

}