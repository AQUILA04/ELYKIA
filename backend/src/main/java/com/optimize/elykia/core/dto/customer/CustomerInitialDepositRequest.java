package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerInitialDepositRequest {

    @NotBlank
    @Size(max = 20)
    private String mobileMoneyPhone;

    @NotNull
    @DecimalMin(value = "500.0", message = "Le montant minimum du dépôt initial est de 500 FCFA.")
    @DecimalMax(value = "2000000.0", message = "Le montant maximum du dépôt initial est de 2 000 000 FCFA.")
    private Double mobileMoneyAmount;

    @NotBlank
    @Size(max = 100)
    private String mobileMoneyReference;

    @Size(max = 255)
    private String notes;
}
