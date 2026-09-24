package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.SaleCancellationFileType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "sale_cancellation_file")
public class SaleCancellationFile extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private SaleCancellationRun run;

    @Column(nullable = false)
    private String fileName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SaleCancellationFileType fileType;

    @Column(nullable = false)
    private String storageBucket;

    @Column(nullable = false)
    private String storageKey;

    private Long creditId;
    private String creditReference;
    private String clientName;
    private Double amount;
}
