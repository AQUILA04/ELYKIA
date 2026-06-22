package com.optimize.elykia.core.dto.report;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class CashDepositDto {
    private Long id;
    private LocalDate date;
    private String commercialUsername;
    private Double amount;
    private Double creditAmount;
    private Double tontineAmount;
    private Double newBalanceAmount;
    private Double surplusAmount;
    private String billetage;
    private String reference;
    private String receivedBy;
    private LocalDateTime createdAt;
}
