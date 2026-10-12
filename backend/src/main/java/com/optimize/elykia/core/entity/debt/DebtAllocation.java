package com.optimize.elykia.core.entity.debt;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "debt_allocation")
@Getter
@Setter
@NoArgsConstructor
public class DebtAllocation extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_id", nullable = false)
    @JsonIgnore
    private DebtSettlement settlement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_document_id", nullable = false)
    @JsonIgnore
    private DebtDocument debtDocument;

    @Column(nullable = false)
    private Double amount = 0.0;
}
