package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerOnboardingStatusDto {
    private String clientId;
    private String fullName;
    private String phone;
    private String activationStatus;
    private boolean idDocumentUploaded;
    private String profilPhotoUrl;
    private String cardPhotoUrl;
    private String cardType;
    private String cardID;
    /** NONE | INITIE | VALIDE | REJETE */
    private String initialDepositStatus;
    private Double initialDepositAmount;
    private String activationRejectionReason;
}
