package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WithdrawalFeeBracketDto {

    private Long id;

    @NotBlank
    private String network;

    @NotNull
    @PositiveOrZero
    private Long minAmount;

    @NotNull
    private Long maxAmount;

    @NotNull
    @PositiveOrZero
    private Long feeAmount;
}
