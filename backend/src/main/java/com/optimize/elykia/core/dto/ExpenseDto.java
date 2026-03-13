package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ExpenseDto {
    private Long id;
    private Long expenseTypeId;
    private String expenseTypeName;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private String description;
    private String reference;
    private State state =State.ENABLED;

}
