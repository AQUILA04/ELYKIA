package com.optimize.elykia.sale.web.dto;

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
    double sumPaidAmount;
    double sumRemainingAmount;
    /** Vrai si le stock vendu correspond à la somme imputée par les ventes (à 1 F près). */
    boolean consistent;
    /** Stock vendu − somme imputée par les ventes (0 si concordant). */
    double gapAmount;
    int salesCount;
    List<StockLinkedSaleDto> sales;
}
