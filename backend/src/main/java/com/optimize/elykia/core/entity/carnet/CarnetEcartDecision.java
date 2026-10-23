package com.optimize.elykia.core.entity.carnet;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.CarnetEcartDirection;
import com.optimize.elykia.core.enumaration.CarnetEcartDomain;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "carnet_ecart_decision")
@Getter
@Setter
@NoArgsConstructor
public class CarnetEcartDecision extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CarnetEcartDomain domain;

    @Column(name = "credit_field_control_id")
    private Long creditFieldControlId;

    @Column(name = "tontine_field_control_id")
    private Long tontineFieldControlId;

    @Column(name = "tontine_line_id")
    private Long tontineLineId;

    @Column(name = "commercial_username", nullable = false, length = 100)
    private String commercialUsername;

    @Column(name = "system_amount", nullable = false)
    private Double systemAmount;

    @Column(name = "notebook_amount", nullable = false)
    private Double notebookAmount;

    @Column(name = "difference_amount", nullable = false)
    private Double differenceAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CarnetEcartDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CarnetEcartStatus status;

    @Column(name = "rejection_note", length = 1000)
    private String rejectionNote;

    @Column(name = "decided_by", nullable = false, length = 100)
    private String decidedBy;

    @Column(name = "decided_at", nullable = false)
    private LocalDateTime decidedAt;

    @Column(name = "mise_reference", length = 64)
    private String miseReference;

    @Column(name = "debt_document_id")
    private Long debtDocumentId;

    @Column(name = "operation_date")
    private LocalDate operationDate;
}
