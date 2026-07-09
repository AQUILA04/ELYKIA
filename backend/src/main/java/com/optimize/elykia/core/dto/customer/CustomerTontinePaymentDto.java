package com.optimize.elykia.core.dto.customer;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class CustomerTontinePaymentDto {
    private String id;
    private String reference;
    private double amount;
    private String collectionDate;
    private boolean deliveryCollection;
    private double societyShareAmount;
    private String status;

    public CustomerTontinePaymentDto(
            Long id,
            String reference,
            Double amount,
            LocalDateTime collectionDate,
            Boolean deliveryCollection,
            Double societyShareAmount,
            String status) {
        this.id = id != null ? String.valueOf(id) : null;
        this.reference = reference;
        this.amount = amount != null ? amount : 0;
        this.collectionDate = collectionDate != null ? collectionDate.toString() : null;
        this.deliveryCollection = Boolean.TRUE.equals(deliveryCollection);
        this.societyShareAmount = societyShareAmount != null ? societyShareAmount : 0;
        this.status = status;
    }
}
