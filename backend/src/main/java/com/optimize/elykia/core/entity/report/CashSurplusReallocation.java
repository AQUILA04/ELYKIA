package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cash_surplus_reallocation")
@Getter
@Setter
@NoArgsConstructor
public class CashSurplusReallocation extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private LocalDate periodStart;

    @Column(nullable = false)
    private LocalDate periodEnd;

    @Column(nullable = false)
    private LocalDateTime performedAt;

    @Column(nullable = false, length = 100)
    private String performedBy;

    @Column(nullable = false)
    private Double surplusBefore = 0.0;

    @Column(nullable = false)
    private Double creditAllocated = 0.0;

    @Column(nullable = false)
    private Double tontineAllocated = 0.0;

    @Column(nullable = false)
    private Double newBalanceAllocated = 0.0;

    @Column(nullable = false)
    private Double surplusRemaining = 0.0;

    @Column(nullable = false)
    private Double remainingBefore = 0.0;

    @Column(nullable = false)
    private Double remainingAfter = 0.0;

    @Column(nullable = false)
    private Double totalReallocated = 0.0;

    @OneToMany(mappedBy = "reallocation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("depositDate ASC, id ASC")
    private List<CashSurplusReallocationLine> lines = new ArrayList<>();

    public void addLine(CashSurplusReallocationLine line) {
        line.setReallocation(this);
        lines.add(line);
    }
}
