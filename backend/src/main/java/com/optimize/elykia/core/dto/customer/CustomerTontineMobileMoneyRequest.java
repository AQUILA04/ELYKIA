package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerTontineMobileMoneyRequest {

    @NotNull
    @Positive
    private Double expectedAmount;

    @NotBlank
    private String mobileMoneyPhone;

    @NotNull
    @Positive
    private Double mobileMoneyAmount;

    @NotBlank
    private String mobileMoneyReference;

    private String notes;
}
