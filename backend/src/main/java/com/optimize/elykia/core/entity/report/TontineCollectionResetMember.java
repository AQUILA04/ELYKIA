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
@Table(name = "tontine_collection_reset_member")
public class TontineCollectionResetMember extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private TontineCollectionResetRun run;

    @Column(name = "tontine_member_id", nullable = false)
    private Long tontineMemberId;

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "client_code")
    private String clientCode;

    @Column(name = "total_contribution_before", nullable = false)
    private Double totalContributionBefore = 0.0;

    @Column(name = "society_share_before", nullable = false)
    private Double societyShareBefore = 0.0;

    @Column(name = "available_contribution_before", nullable = false)
    private Double availableContributionBefore = 0.0;

    @Column(name = "validated_months_before", nullable = false)
    private Integer validatedMonthsBefore = 0;

    @Column(name = "current_month_days_before", nullable = false)
    private Integer currentMonthDaysBefore = 0;

    @Column(name = "total_contribution_after", nullable = false)
    private Double totalContributionAfter = 0.0;

    @Column(name = "society_share_after", nullable = false)
    private Double societyShareAfter = 0.0;

    @Column(name = "available_contribution_after", nullable = false)
    private Double availableContributionAfter = 0.0;

    @Column(name = "validated_months_after", nullable = false)
    private Integer validatedMonthsAfter = 0;

    @Column(name = "current_month_days_after", nullable = false)
    private Integer currentMonthDaysAfter = 0;

    @Column(name = "removed_amount", nullable = false)
    private Double removedAmount = 0.0;

    @Column(name = "kept_amount", nullable = false)
    private Double keptAmount = 0.0;
}
