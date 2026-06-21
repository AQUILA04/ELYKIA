package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.RemittanceInitiator;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "cash_period_remittance")
@Getter
@Setter
@NoArgsConstructor
public class CashPeriodRemittance extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Double totalAmount = 0.0;

    @Column(nullable = false)
    private Double creditAmount = 0.0;

    @Column(nullable = false)
    private Double tontineAmount = 0.0;

    @Column(nullable = false)
    private Double newBalanceAmount = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RemittanceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RemittanceInitiator initiatedBy;

    private String submittedBy;
    private String receivedBy;
    private LocalDateTime submittedAt;
    private LocalDateTime receivedAt;

    @Column(nullable = false, unique = true)
    private String reference;
}
