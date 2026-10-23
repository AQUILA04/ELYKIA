package com.optimize.elykia.core.dto.adhesion;

import com.optimize.elykia.core.entity.customer.CustomerAdhesionSubmission;

import java.time.LocalDateTime;

public record CustomerAdhesionSubmissionDto(
        Long id,
        Long clientId,
        String adhesionType,
        String requestKind,
        String mobileMoneyPhone,
        Double mobileMoneyAmount,
        String mobileMoneyReference,
        String notes,
        String status,
        LocalDateTime createdAt,
        String rejectionReason
) {
    public static CustomerAdhesionSubmissionDto from(CustomerAdhesionSubmission submission) {
        return new CustomerAdhesionSubmissionDto(
                submission.getId(),
                submission.getClientId(),
                submission.getAdhesionType().name(),
                submission.getRequestKind().name(),
                submission.getMobileMoneyPhone(),
                submission.getMobileMoneyAmount(),
                submission.getMobileMoneyReference(),
                submission.getNotes(),
                submission.getStatus().name(),
                submission.getCreatedDate(),
                submission.getRejectionReason());
    }
}
