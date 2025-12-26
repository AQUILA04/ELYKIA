package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CreditStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public record StockOutput(Long id,
                          String reference,
                          CreditStatus status,
                          Boolean updatable,
                          Double totalAmount,
                          LocalDate createdAt,
                          String commercialUsername,
                          List<StockOutputItem> items) {
    public StockOutput addItems(List<StockOutputItem> items) {
        return new StockOutput(this.id, this.reference, this.status, this.updatable, this.totalAmount, this.createdAt, this.commercialUsername, items);
    }
}
