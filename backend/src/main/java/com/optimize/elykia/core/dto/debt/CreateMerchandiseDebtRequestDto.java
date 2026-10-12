package com.optimize.elykia.core.dto.debt;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMerchandiseDebtRequestDto {
    @NotNull
    private Long monthlyStockId;
}
