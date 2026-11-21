package com.optimize.elykia.customer.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CustomerOrderRequest {
    @NotEmpty
    @Valid
    private List<CustomerOrderItemRequest> items;
    private String deliveryAddress;
    private String notes;
    /** PERSONAL, BUSINESS ou EVENT. Absent = personnel. */
    private String creditPurpose;
}
