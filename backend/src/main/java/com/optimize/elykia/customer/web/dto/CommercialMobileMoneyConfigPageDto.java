package com.optimize.elykia.customer.web.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class CommercialMobileMoneyConfigPageDto {
    String globalMixxNumber;
    String globalMoovNumber;
    List<CommercialMobileMoneyConfigRowDto> commercials;
}
