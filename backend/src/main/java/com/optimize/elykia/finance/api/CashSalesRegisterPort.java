package com.optimize.elykia.finance.api;

import java.time.LocalDate;

/** Port d'enregistrement des ventes au comptant et de leurs annulations dans la caisse dédiée. */
public interface CashSalesRegisterPort {

    void recordCashSaleReceipt(Long saleId, String saleReference, double amount, Long clientId, String clientName,
                               String collector, String performedBy, LocalDate accountingDate);

    void recordCashSaleReversal(Long saleId, String saleReference, double amount, Long clientId, String clientName,
                                String collector, String performedBy, LocalDate accountingDate);
}
