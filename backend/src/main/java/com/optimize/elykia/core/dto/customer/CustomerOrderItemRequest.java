package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerOrderItemRequest {
    @NotBlank
    private String articleId;

    @NotNull
    @Positive
    private Integer quantity;
}
