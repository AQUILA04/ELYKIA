package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.MonthlyReportRunStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "monthly_report_run", uniqueConstraints = {
        @UniqueConstraint(name = "uk_monthly_report_run_month", columnNames = {"year", "month"})
})
public class MonthlyReportRun extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonthlyReportRunStatus status = MonthlyReportRunStatus.PENDING;

    private Double totalRevenueAmount = 0.0;
    private Double totalPurchaseAmount = 0.0;
    private Double totalMarginAmount = 0.0;

    private String currentChunkCursor;
    private Integer totalCommercialCount = 0;
    private Integer completedCommercialCount = 0;
    private String errorMessage;
}
