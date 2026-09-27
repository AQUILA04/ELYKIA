package com.optimize.elykia.core.dto.customer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class CustomerCheckPhoneResponse {
    private boolean exists;
    private boolean pinConfigured;
    private boolean canRegister;
    private String maskedName;
    /** PENDING | ACTIVE | REJECTED — renseigné si le compte existe. */
    private String activationStatus;
}
