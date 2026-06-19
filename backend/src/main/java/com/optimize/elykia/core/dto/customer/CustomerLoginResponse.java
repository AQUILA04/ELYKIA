package com.optimize.elykia.core.dto.customer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class CustomerLoginResponse {
    private String token;
    private String clientId;
    private String fullName;
    private String phone;
    private String expiresAt;
}
