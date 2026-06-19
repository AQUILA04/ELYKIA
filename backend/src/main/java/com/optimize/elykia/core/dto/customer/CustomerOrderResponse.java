package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerOrderResponse {
    private String orderId;
    private String reference;
    private String status;
    private double totalAmount;
    private String createdAt;
}
