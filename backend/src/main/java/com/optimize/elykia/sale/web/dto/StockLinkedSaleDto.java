package com.optimize.elykia.sale.web.dto;

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
    /** Montant déjà payé par le client sur ce crédit. */
    Double paidAmount;
    /** Reste dû par le client sur ce crédit. */
    Double remainingAmount;
    String type;
    String status;
}
