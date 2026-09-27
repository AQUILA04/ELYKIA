package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClientRegistrationActivateRequest {

    @NotBlank
    @Size(max = 100)
    private String collector;

    @Size(max = 100)
    private String tontineCollector;

    /** Si true et dépôt INITIE présent, le valide et crédite le solde. */
    private boolean validateInitialDeposit = true;
}
