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
public class TontineCollectionWebDto {
    private Long id;
    private String reference;
    private String clientName;
    private String commercialUsername;
    private Double amount;
    private LocalDateTime collectionDate;
}
