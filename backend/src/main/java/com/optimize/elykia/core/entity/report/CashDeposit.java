package com.optimize.elykia.core.entity.report;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @Column(columnDefinition = "TEXT")
    private String billetage; // JSON storing { "10000": 5, "5000": 2 }

    private String receivedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_report_id")
    @JsonIgnore
    private DailyCommercialReport dailyReport;
}
