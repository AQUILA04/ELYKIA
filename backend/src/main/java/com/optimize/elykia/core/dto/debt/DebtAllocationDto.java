package com.optimize.elykia.core.dto.debt;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DebtAllocationDto {
    Long debtDocumentId;
    String debtReference;
    Double amount;
}
