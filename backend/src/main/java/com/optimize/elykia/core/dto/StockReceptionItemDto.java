package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockReceptionItemDto {
    private Long id;
    private Long articleId;
    private String articleName;
    private Integer quantity;
    private Double unitPrice;
    private Double totalPrice;
}
