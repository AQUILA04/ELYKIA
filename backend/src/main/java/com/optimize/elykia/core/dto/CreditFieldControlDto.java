package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.FieldControlStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CreditFieldControlDto {
    private Long id;
    private Long creditId;
    private Double notebookTotalAmount;
    private Double systemTotalAmountPaid;
    private Double differenceAmount;
    private FieldControlStatus status;
    private LocalDateTime observedAt;
    private String observedBy;
    private String note;
}
