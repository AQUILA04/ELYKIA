package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.FieldControlStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class TontineMemberFieldControlDto {
    private Long id;
    private Long tontineMemberId;
    private String reference;
    private Double notebookTotalAmount;
    private Double systemTotalAmount;
    private Double differenceAmount;
    private FieldControlStatus status;
    private LocalDateTime observedAt;
    private String observedBy;
    private String note;
    private List<TontineMemberFieldControlLineDto> lines;
}
