package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_collection_reset_file")
public class TontineCollectionResetFile extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private TontineCollectionResetRun run;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String storageBucket;

    @Column(nullable = false)
    private String storageKey;

    private String commercialUsername;
    private String quarter;
}
