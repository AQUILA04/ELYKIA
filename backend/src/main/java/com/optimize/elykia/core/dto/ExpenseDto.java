package com.optimize.elykia.core.dto;

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
    private Boolean accounted;
    /** Vrai si la dépense est déjà rattachée à une remise, en attente ou reçue. */
    private Boolean linkedToRemittance;
    private String remittanceReference;
}
