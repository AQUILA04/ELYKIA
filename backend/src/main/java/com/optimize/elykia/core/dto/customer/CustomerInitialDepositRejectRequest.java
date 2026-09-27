package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerInitialDepositRejectRequest {

    @Size(max = 500)
    private String reason;
}
