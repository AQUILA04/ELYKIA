package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.SaleCancellationRunStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "sale_cancellation_run")
public class SaleCancellationRun extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private CreditStatus creditStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SaleCancellationRunStatus status = SaleCancellationRunStatus.PENDING;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(nullable = false)
    private String triggeredBy;

    private Integer totalSalesFound = 0;
    private Integer cancelledSalesCount = 0;
    private Double cancelledSalesAmount = 0.0;
    private Integer excludedSalesCount = 0;
    private Double excludedSalesAmount = 0.0;
    private Integer pdfFileCount = 0;

    private String archiveFileName;
    private String archiveStorageKey;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(columnDefinition = "TEXT")
    private String excludedSalesDetails;
}
