package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_collection_reset_report_day")
public class TontineCollectionResetReportDay extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private TontineCollectionResetRun run;

    @Column(name = "commercial_username", nullable = false)
    private String commercialUsername;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "collections_amount_before", nullable = false)
    private Double collectionsAmountBefore = 0.0;

    @Column(name = "collections_count_before", nullable = false)
    private Integer collectionsCountBefore = 0;

    @Column(name = "catchup_amount_before", nullable = false)
    private Double catchupAmountBefore = 0.0;

    @Column(name = "catchup_count_before", nullable = false)
    private Integer catchupCountBefore = 0;

    @Column(name = "amount_to_deposit_before", nullable = false)
    private Double amountToDepositBefore = 0.0;

    @Column(name = "collections_amount_after", nullable = false)
    private Double collectionsAmountAfter = 0.0;

    @Column(name = "collections_count_after", nullable = false)
    private Integer collectionsCountAfter = 0;

    @Column(name = "catchup_amount_after", nullable = false)
    private Double catchupAmountAfter = 0.0;

    @Column(name = "catchup_count_after", nullable = false)
    private Integer catchupCountAfter = 0;

    @Column(name = "amount_to_deposit_after", nullable = false)
    private Double amountToDepositAfter = 0.0;

    @Column(name = "amount_deposited", nullable = false)
    private Double amountDeposited = 0.0;

    @Column(name = "tontine_amount_deposited", nullable = false)
    private Double tontineAmountDeposited = 0.0;
}
