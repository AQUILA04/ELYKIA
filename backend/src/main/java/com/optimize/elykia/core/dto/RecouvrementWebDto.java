package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecouvrementWebDto {
    private Long id;
    private String reference;
    private String creditReference;
    private String clientName;
    private String commercial;
    private Double amount;
    private Double totalAmountRemaining;
    private LocalDateTime creationDate;
}
