package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_collection_reset_line")
public class TontineCollectionResetLine extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private TontineCollectionResetRun run;

    @Column(name = "collection_id", nullable = false)
    private Long collectionId;

    @Column(name = "tontine_member_id", nullable = false)
    private Long tontineMemberId;

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "client_code")
    private String clientCode;

    private String quarter;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "collection_date", nullable = false)
    private LocalDateTime collectionDate;

    @Column(name = "commercial_username", nullable = false)
    private String commercialUsername;

    private String reference;

    @Column(name = "society_share_amount")
    private Double societyShareAmount;

    @Column(name = "is_delivery_collection")
    private Boolean deliveryCollection;

    @Column(name = "contribution_month")
    private LocalDate contributionMonth;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;
}
