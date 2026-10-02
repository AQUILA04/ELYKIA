package com.optimize.elykia.core.entity.customer;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_mobile_money_submission")
@Getter
@Setter
@NoArgsConstructor
public class CustomerMobileMoneySubmission extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "credit_id", nullable = false)
    private Long creditId;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "expected_amount", nullable = false)
    private Double expectedAmount;

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

    /** Recouvrement créé à la validation ({@code credit_timeline.id}). */
    @Column(name = "credit_timeline_id")
    private Long creditTimelineId;

    @Column(name = "payment_proof_id")
    private Long paymentProofId;
}
