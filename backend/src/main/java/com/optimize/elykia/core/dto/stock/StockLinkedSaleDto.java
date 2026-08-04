package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class StockLinkedSaleDto {
    Long creditId;
    String reference;
    String clientFullName;
    Double totalAmount;
    LocalDate beginDate;
    Double soldValueOnStock;
    String type;
    String status;
}
