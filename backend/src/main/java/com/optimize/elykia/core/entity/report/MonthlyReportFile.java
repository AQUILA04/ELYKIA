package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.MonthlyReportFileType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "monthly_report_file")
public class MonthlyReportFile extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private MonthlyReportRun run;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonthlyReportFileType reportType;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String storageBucket;

    @Column(nullable = false)
    private String storageKey;

    private String commercialUsername;
}
