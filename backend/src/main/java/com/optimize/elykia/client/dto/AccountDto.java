package com.optimize.elykia.client.dto;

import com.optimize.elykia.client.enumeration.AccountStatus;
import lombok.Data;

@Data
public class AccountDto {
    private Long id;
    private String accountNumber;
    private Long clientId;
    private double accountBalance;
    private AccountStatus status;
}
