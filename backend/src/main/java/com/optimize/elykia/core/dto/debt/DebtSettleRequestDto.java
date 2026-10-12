package com.optimize.elykia.core.dto.debt;

import com.optimize.elykia.core.enumaration.DebtSettlementMode;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.List;

@Data
public class DebtSettleRequestDto {
    @NotEmpty
    private List<Long> debtIds;

    @NotNull
    private DebtSettlementMode settlementMode;

    /** Montant total à ventiler (optionnel : sinon solde restant des dettes). */
    @Positive
    private Double amount;

    private Long surplusDebtId;

    private String note;
}
