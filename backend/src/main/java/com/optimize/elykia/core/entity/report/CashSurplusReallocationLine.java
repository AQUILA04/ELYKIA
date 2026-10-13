package com.optimize.elykia.core.entity.report;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "cash_surplus_reallocation_line")
@Getter
@Setter
@NoArgsConstructor
public class CashSurplusReallocationLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reallocation_id", nullable = false)
    @JsonIgnore
    private CashSurplusReallocation reallocation;

    private Long cashDepositId;

    private String depositReference;

    @Column(nullable = false)
    private LocalDate depositDate;

    @Column(nullable = false)
    private Double surplusTaken = 0.0;

    @Column(nullable = false)
    private Double creditAllocated = 0.0;

    @Column(nullable = false)
    private Double tontineAllocated = 0.0;

    @Column(nullable = false)
    private Double newBalanceAllocated = 0.0;
}
