package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleSalePackDto {
    @NotNull
    @Min(2)
    private Integer quantity;

    @NotNull
    @Positive
    private Double salePrice;
}
