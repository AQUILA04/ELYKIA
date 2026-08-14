package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.TontineAllocationMigrationRunStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_allocation_migration_run")
public class TontineAllocationMigrationRun extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sessionId;

    @Column(nullable = false, length = 10)
    private String fromVersion;

    @Column(nullable = false, length = 10)
    private String toVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TontineAllocationMigrationRunStatus status = TontineAllocationMigrationRunStatus.PENDING;

    @Column(nullable = false)
    private String triggeredBy;

    @Column(nullable = false)
    private Integer totalMembers = 0;

    @Column(nullable = false)
    private Integer processedMembers = 0;

    @Column(nullable = false)
    private Integer failedMembers = 0;

    @Column(nullable = false)
    private Long lastProcessedMemberId = 0L;

    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;
}
