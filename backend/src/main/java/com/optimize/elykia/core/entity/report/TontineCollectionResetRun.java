package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_collection_reset_run")
public class TontineCollectionResetRun extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sessionId;

    @Column(nullable = false)
    private Integer sessionYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TontineCollectionResetRunStatus status = TontineCollectionResetRunStatus.PENDING;

    @Column(nullable = false)
    private String triggeredBy;

    private Integer collectionsCount = 0;
    private Double collectionsAmount = 0.0;
    private Integer membersResetCount = 0;
    private Integer pdfFileCount = 0;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;
}
