package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "monthly_report_outbox_entry")
public class MonthlyReportOutboxEntry extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private MonthlyReportRun run;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonthlyReportFileType fileType;

    private String commercialUsername;

    @Column(nullable = false)
    private String storageBucket;

    @Column(nullable = false)
    private String storageKey;

    @Column(nullable = false)
    private String localFilePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonthlyReportOutboxStatus status = MonthlyReportOutboxStatus.PENDING;

    private Integer retryCount = 0;
    private LocalDateTime lastAttemptAt;

    @Column(length = 2000)
    private String errorMessage;
}
