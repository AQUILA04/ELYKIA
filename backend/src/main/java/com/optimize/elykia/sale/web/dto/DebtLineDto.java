package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.DebtPriceBasis;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DebtLineDto {
    Long id;
    Long articleId;
    String articleName;
    Long stockItemId;
    Long inventoryItemId;
    String lineCode;
    String label;
    Integer quantity;
    Double unitPrice;
    Double amount;
    DebtPriceBasis priceBasis;
    Integer sortOrder;
}
