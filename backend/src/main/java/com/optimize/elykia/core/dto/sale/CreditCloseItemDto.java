package com.optimize.elykia.core.dto.sale;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreditCloseItemDto {
    @NotNull
    private Long creditId;

    @NotNull
    @Positive
    private Double amount;

    private Boolean isPartial = false;
}
