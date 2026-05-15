package com.optimize.elykia.core.dto;

import lombok.Data;

@Data
public class ReliquatSyncUnitDto {
    private Long clientId;
    private Double totalAmount;
    private String lastRecoveryId;
    private String lastAccountedDate;
    private String id; // Mobile ID
}
