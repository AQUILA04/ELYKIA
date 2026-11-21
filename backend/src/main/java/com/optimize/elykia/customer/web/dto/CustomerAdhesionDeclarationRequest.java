package com.optimize.elykia.customer.web.dto;

import com.optimize.elykia.customer.domain.AdhesionRequestKind;
import com.optimize.elykia.customer.domain.AdhesionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerAdhesionDeclarationRequest {
    @NotNull
    private AdhesionType adhesionType;
    @NotNull
    private AdhesionRequestKind requestKind;
    @NotBlank
    private String mobileMoneyPhone;
    @Positive
    private double amount;
    @NotBlank
    private String mobileMoneyReference;
    private String notes;
}
