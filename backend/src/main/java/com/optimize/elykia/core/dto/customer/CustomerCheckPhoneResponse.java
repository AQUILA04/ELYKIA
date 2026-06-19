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
    private String maskedName;
}
