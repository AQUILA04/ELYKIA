package com.optimize.elykia.core.entity.report;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.dto.report.CashDepositSliceDto;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CashDeposit extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private Double amount;

    @Column(columnDefinition = "double precision default 0")
    private Double creditAmount = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double tontineAmount = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double newBalanceAmount = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double surplusAmount = 0.0;

    @Column(columnDefinition = "TEXT")
    private String billetage; // JSON storing { "10000": 5, "5000": 2 }

    private String reference;

    private String receivedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_report_id")
    @JsonIgnore
    private DailyCommercialReport dailyReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remittance_id")
    @JsonIgnore
    private CashPeriodRemittance remittance;

    /** Jour choisi dans le rapport au moment de l'encaissement. */
    private LocalDate captureDate;

    @Column(length = 36)
    private String depositGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_deposit_id")
    @JsonIgnore
    private CashDeposit parentDeposit;

    @Transient
    private List<CashDepositSliceDto> catchupAllocations;

    /** Total physique du groupe, renseigné à l'affichage de la ligne parente. */
    @Transient
    private Double physicalAmount;

    @JsonProperty("parentDepositId")
    public Long getParentDepositId() {
        return parentDeposit != null ? parentDeposit.getId() : null;
    }

    @JsonProperty("createdAt")
    public LocalDateTime getCreatedAt() {
        return getCreatedDate();
    }
}
