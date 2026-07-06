package com.optimize.elykia.core.entity.report;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "commercial_report_monthly",
        uniqueConstraints = @UniqueConstraint(columnNames = {"commercial_username", "year", "month"}))
@Getter
@Setter
@NoArgsConstructor
public class CommercialReportMonthly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commercial_username", nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    @Column(name = "credit_sales_amount", nullable = false)
    private Double creditSalesAmount = 0.0;

    @Column(name = "credit_sales_count", nullable = false)
    private Integer creditSalesCount = 0;

    @Column(name = "collections_amount", nullable = false)
    private Double collectionsAmount = 0.0;

    @Column(name = "total_advances_amount", nullable = false)
    private Double totalAdvancesAmount = 0.0;

    @Column(name = "total_credit_amount_deposited", nullable = false)
    private Double totalCreditAmountDeposited = 0.0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
