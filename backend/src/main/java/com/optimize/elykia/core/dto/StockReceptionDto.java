package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDate;
import java.util.Set;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockReceptionDto {
    private Long id;
    private String reference;
    private LocalDate receptionDate;
    private String receivedBy;
    private Double totalAmount;
    private Set<StockReceptionItemDto> items;
}
