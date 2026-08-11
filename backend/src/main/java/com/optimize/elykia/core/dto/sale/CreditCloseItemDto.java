package com.optimize.elykia.core.dto.sale;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreditCloseItemDto {
    @NotNull
    private Long creditId;

    @NotNull
    @PositiveOrZero
    private Double amount;

    private Boolean isPartial = false;

    /** Idempotency key (mobile offline sync). Optional for web. */
    @Size(max = 64)
    private String reference;
}
