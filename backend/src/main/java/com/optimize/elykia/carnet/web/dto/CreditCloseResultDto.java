package com.optimize.elykia.carnet.web.dto;

import com.optimize.elykia.carnet.domain.RecoveryManagerOperation;
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
