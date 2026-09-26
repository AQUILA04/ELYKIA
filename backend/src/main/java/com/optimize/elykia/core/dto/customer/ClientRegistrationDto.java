package com.optimize.elykia.core.dto.customer;

import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class ClientRegistrationDto {
    private Long clientId;
    private String firstname;
    private String lastname;
    private String fullName;
    private String phone;
    private String address;
    private String quarter;
    private LocalDate dateOfBirth;
    private String occupation;
    private String cardType;
    private String cardID;
    private String profilPhotoUrl;
    private String cardPhotoUrl;
    private String activationStatus;
    private String collector;
    private String tontineCollector;
    private LocalDateTime registeredAt;
    private boolean hasInitialDeposit;
    private Long initialDepositId;
    private CustomerSubmissionStatus initialDepositStatus;
    private Double initialDepositAmount;
    private String initialDepositPhone;
    private String initialDepositReference;
    private String activationRejectionReason;
}
