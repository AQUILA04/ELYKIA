package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommercialStockItemDto {
    private Long articleId;
    private String articleName;
    private String commercialName;
    private Double sellingPrice;
    private Double creditSalePrice;
    private Integer quantityRemaining;


}
