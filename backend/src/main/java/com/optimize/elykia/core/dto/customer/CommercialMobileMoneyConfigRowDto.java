package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CommercialMobileMoneyConfigRowDto {
    String commercialUsername;
    String commercialFullName;
    String commercialPhone;
    String mixxNumber;
    String moovNumber;
    String effectiveMixxNumber;
    String effectiveMoovNumber;
    boolean mixxUsesGlobalDefault;
    boolean moovUsesGlobalDefault;
}
