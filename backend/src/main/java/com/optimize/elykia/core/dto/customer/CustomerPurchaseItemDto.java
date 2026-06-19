package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerPurchaseItemDto {
    private String articleId;
    private String articleName;
    private int quantity;
    private double unitPrice;
    private double totalPrice;
}
