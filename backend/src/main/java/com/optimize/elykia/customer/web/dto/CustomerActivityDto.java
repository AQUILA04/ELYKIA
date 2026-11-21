package com.optimize.elykia.customer.web.dto;

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
