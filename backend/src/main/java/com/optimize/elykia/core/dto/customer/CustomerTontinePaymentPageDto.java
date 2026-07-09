package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CustomerTontinePaymentPageDto {
    private List<CustomerTontinePaymentDto> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
