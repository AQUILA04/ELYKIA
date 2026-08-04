package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class StockLinkedSalesResponseDto {
    Long stockId;
    String collector;
    Integer month;
    Integer year;
    double stockSoldValue;
    double sumCreditTotalAmount;
    double sumSoldValueOnStock;
    int salesCount;
    List<StockLinkedSaleDto> sales;
}
