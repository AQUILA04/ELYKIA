package com.optimize.elykia.customer.web.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerInitialDepositRejectRequest {

    @Size(max = 500)
    private String reason;
}
