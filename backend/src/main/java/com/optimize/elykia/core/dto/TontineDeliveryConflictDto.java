package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOperation;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOutcome;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictReason;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** Ligne du journal des doublons de commande / livraison tontine. */
@Data
@Builder
public class TontineDeliveryConflictDto {
    private Long id;
    private Long tontineMemberId;
    private Long tontineSessionId;
    private String clientName;
    private String commercialUsername;
    private Long existingDeliveryId;
    private String existingReference;
    private Double existingAmount;
    private LocalDateTime existingDeliveryDate;
    private String incomingReference;
    private Double incomingAmount;
    private String incomingItems;
    private Double availableBalance;
    private TontineDeliveryConflictOperation operation;
    private TontineDeliveryConflictOutcome outcome;
    private TontineDeliveryConflictReason reason;
    private String deviceId;
    private String recordedBy;
    private Integer attempts;
    private LocalDateTime firstSeenAt;
    private LocalDateTime lastSeenAt;
}
