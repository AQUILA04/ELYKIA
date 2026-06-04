package com.optimize.elykia.core.dto.sale;

import com.optimize.elykia.core.entity.sale.RecoveryManagerOperation;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CreditCloseResultDto {
    private Long creditId;
    private String creditReference;
    private String clientName;
    private String errorMessage;
    private RecoveryManagerOperation operation;
}
