package com.optimize.elykia.core.entity.customer;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_initial_deposit_submission")
@Getter
@Setter
@NoArgsConstructor
public class CustomerInitialDepositSubmission extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "mobile_money_phone", nullable = false, length = 20)
    private String mobileMoneyPhone;

    @Column(name = "mobile_money_amount", nullable = false)
    private Double mobileMoneyAmount;

    @Column(name = "mobile_money_reference", nullable = false, length = 100)
    private String mobileMoneyReference;

    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CustomerSubmissionStatus status = CustomerSubmissionStatus.INITIE;

    @Column(name = "validated_by", length = 100)
    private String validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "rejected_by", length = 100)
    private String rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;
}
