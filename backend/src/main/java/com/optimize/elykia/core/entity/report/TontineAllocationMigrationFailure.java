package com.optimize.elykia.core.entity.report;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Un membre qui n'a pas pu être recalculé lors d'un run. Les autres membres ne sont jamais bloqués. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_allocation_migration_failure",
        indexes = @Index(name = "idx_alloc_migration_failure_run", columnList = "runId"))
public class TontineAllocationMigrationFailure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long runId;

    @Column(nullable = false)
    private Long memberId;

    private String memberName;

    private String errorType;

    @Column(columnDefinition = "TEXT")
    private String message;

    /** Premières lignes de la pile d'appels, pour le diagnostic. */
    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();
}
