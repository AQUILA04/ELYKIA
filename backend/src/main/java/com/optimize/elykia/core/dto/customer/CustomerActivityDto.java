package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerActivityDto {
    private String id;
    private String type;
    private String label;
    private double amount;
    private String date;
    private String status;
}
