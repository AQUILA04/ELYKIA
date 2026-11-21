package com.optimize.elykia.sale.web.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMerchandiseDebtRequestDto {
    @NotNull
    private Long monthlyStockId;
}
