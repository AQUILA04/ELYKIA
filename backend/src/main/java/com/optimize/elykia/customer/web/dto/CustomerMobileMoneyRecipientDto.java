package com.optimize.elykia.customer.web.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CustomerMobileMoneyRecipientDto {
    String collector;
    String collectorName;
    String mixxNumber;
    String moovNumber;
    boolean mixxUsesGlobalDefault;
    boolean moovUsesGlobalDefault;
}
