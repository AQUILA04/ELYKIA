package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.MonthlyReportOutboxStatus;
import com.optimize.elykia.core.enumaration.SaleCancellationFileType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "sale_cancellation_outbox_entry")
public class SaleCancellationOutboxEntry extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id")
    private SaleCancellationRun run;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SaleCancellationFileType fileType;

    @Column(nullable = false)
    private String storageKey;

    @Column(nullable = false)
    private String localFilePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonthlyReportOutboxStatus status = MonthlyReportOutboxStatus.PENDING;

    private Integer retryCount = 0;
    private LocalDateTime lastAttemptAt;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;
}
