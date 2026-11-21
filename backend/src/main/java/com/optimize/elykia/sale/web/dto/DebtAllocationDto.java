package com.optimize.elykia.sale.web.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DebtAllocationDto {
    Long debtDocumentId;
    String debtReference;
    Double amount;
}
